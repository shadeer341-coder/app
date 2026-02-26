
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Question, QuestionCategory } from '@/lib/types';
import { PracticeSession } from '@/components/interview/practice-session';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function shuffle(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


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

    type QuestionQueueItem = Pick<Question, 'id' | 'text' | 'category_id' | 'audio_url' | 'tags' | 'read_time_seconds' | 'answer_time_seconds'> & { categoryName: string };

    // Fetch all data in parallel
    const [
        { data: categoriesData, error: categoriesError },
        { data: questionsData, error: questionsError },
        { data: allPastAttempts, error: answeredError }
    ] = await Promise.all([
        supabase.from('question_categories').select('*').order('sort_order', { ascending: true }),
        supabase.from('questions').select('id, text, category_id, audio_url, tags, read_time_seconds, answer_time_seconds'),
        supabase.from('interview_attempts').select('question_id').eq('user_id', user.id)
    ]);

    if (categoriesError || questionsError) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Error</CardTitle>
                        <CardDescription>Could not load interview questions at this time.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>There was a problem fetching the necessary data from the database. Please try again later.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const categories = (categoriesData as QuestionCategory[] | null) || [];
    const questions = (questionsData as any[] | null) || [];
    const overallAnsweredIds = new Set(allPastAttempts?.map(a => a.question_id) || []);

    // Generate the question queue
    let interviewQueue: QuestionQueueItem[] = [];

    const preInterviewCheckCategory = categories.find(c => c.name === 'Pre-Interview Checks');
    const otherCategories = categories.filter(c => c.name !== 'Pre-Interview Checks');

    // 1. Add "Pre-Interview Checks" questions first.
    if (preInterviewCheckCategory) {
        const checkQuestions = questions.filter(q => q.category_id === preInterviewCheckCategory.id);
        checkQuestions.forEach(q => {
            interviewQueue.push({ ...q, categoryName: preInterviewCheckCategory.name });
        });
    }

    // 2. Add questions from other categories
    otherCategories.forEach(category => {
        if (category.question_limit > 0) {
            const allCategoryQuestions = questions.filter(q => q.category_id === category.id);
            
            // If resuming, we MUST include questions already answered in THIS session
            const sessionAnswered = allCategoryQuestions.filter(q => answeredQuestionIdsInSession.has(q.id));
            
            // For the rest, prioritize unseen questions
            const unseen = allCategoryQuestions.filter(q => !overallAnsweredIds.has(q.id) && !answeredQuestionIdsInSession.has(q.id));
            const seen = allCategoryQuestions.filter(q => overallAnsweredIds.has(q.id) && !answeredQuestionIdsInSession.has(q.id));

            let selected: typeof questions = [...sessionAnswered];
            const remainingNeeded = category.question_limit - selected.length;

            if (remainingNeeded > 0) {
                const shuffledUnseen = shuffle(unseen);
                selected = selected.concat(shuffledUnseen.slice(0, remainingNeeded));
            }

            if (selected.length < category.question_limit) {
                const stillNeeded = category.question_limit - selected.length;
                const shuffledSeen = shuffle(seen);
                selected = selected.concat(shuffledSeen.slice(0, stillNeeded));
            }
            
            selected.forEach(q => {
                interviewQueue.push({ ...q, categoryName: category.name });
            });
        }
    });

    // Determine starting index: the first question in the queue that hasn't been answered in this session
    const startingIndex = interviewQueue.findIndex(q => !answeredQuestionIdsInSession.has(q.id));
    const finalStartingIndex = startingIndex === -1 ? 0 : startingIndex;
    
    return (
        <PracticeSession 
            questions={interviewQueue.slice(0, 4)}
            user={user}
            initialSessionId={pendingSession?.id}
            initialQuestionIndex={finalStartingIndex}
            initialAttemptData={initialAttempts}
        />
    );
}
