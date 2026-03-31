
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Question, QuestionCategory } from '@/lib/types';
import { PracticeSession } from '@/components/interview/practice-session';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';


export default async function PracticePage() {
    const supabase = createSupabaseServerClient();
    const user = await getCurrentUser();

    if (!user) {
        redirect('/');
    }

    // Check for an existing pending session to resume
    const { data: pendingSession } = await supabase
        .from('interview_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .is('process_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    let initialAttempts: any[] = [];
    if (pendingSession) {
        const { data: attempts } = await supabase
            .from('interview_attempts')
            .select('question_id, transcript, snapshots')
            .eq('session_id', pendingSession.id);
        initialAttempts = attempts || [];
    }

    const answeredQuestionIdsInSession = new Set(initialAttempts.map(a => a.question_id));

    // Call the Supabase RPC function to get the correctly shuffled and limited queue!
    const { data: generatedQueue, error: queueError } = await supabase.rpc('get_interview_queue', {
        p_user_id: user.id,
        p_session_id: pendingSession?.id || null
    });

    if (queueError) {
        console.error("Failed to generate question queue:", queueError.message);
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Error Generating Interview</CardTitle>
                        <CardDescription>Could not initialize practice queue.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Please ensure the `get_interview_queue` RPC function has been created in your Supabase dashboard.</p>
                        <p className="text-sm text-muted-foreground mt-4">Error details: {queueError.message}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Map the RPC response correctly to the PracticeSession's expected type
    type QuestionQueueItem = Pick<Question, 'id' | 'text' | 'category_id' | 'audio_url' | 'tags' | 'read_time_seconds' | 'answer_time_seconds'> & { categoryName: string };
    const interviewQueue: QuestionQueueItem[] = (generatedQueue || []).map((q: any) => ({
        id: q.id,
        text: q.text,
        category_id: q.category_id,
        audio_url: q.audio_url,
        tags: q.tags,
        read_time_seconds: q.read_time_seconds,
        answer_time_seconds: q.answer_time_seconds,
        categoryName: q.category_name,
    }));

    // Determine starting index: the first question in the queue that hasn't been answered in this session
    const startingIndex = interviewQueue.findIndex(q => !answeredQuestionIdsInSession.has(q.id));
    const finalStartingIndex = startingIndex === -1 ? 0 : startingIndex;

    return (
        <PracticeSession
            questions={interviewQueue}
            user={user}
            initialSessionId={pendingSession?.id}
            initialQuestionIndex={finalStartingIndex}
            initialAttemptData={initialAttempts}
        />
    );
}
