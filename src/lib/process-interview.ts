
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateInterviewFeedback } from '@/ai/flows/generate-interview-feedback';
import { summarizeInterviewPerformance } from '@/ai/flows/summarize-interview-performance';
import { sendInterviewCompletedEmail } from '@/lib/email';
import type { InterviewAttempt } from '@/lib/types';

export async function processInterviewInBackground(sessionId: string) {
    const supabase = createSupabaseServerClient({ service: true });

    // 1. Fetch all attempts for the session
    const { data: attempts, error: attemptsError } = await supabase
        .from('interview_attempts')
        .select('*, questions (text, tags)')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

    if (attemptsError || !attempts || attempts.length === 0) {
        throw new Error(`No attempts found for session ID: ${sessionId}`);
    }

    // 2. Process each attempt to generate feedback
    let totalScore = 0;
    const processedAttempts: InterviewAttempt[] = [];

    for (const attempt of attempts) {
        const feedbackResult = await generateInterviewFeedback({
            transcript: attempt.transcript,
            questionText: attempt.questions?.text || '',
            questionTags: attempt.questions?.tags || [],
            snapshots: attempt.snapshots,
        });
        
        const { error: updateError } = await supabase
            .from('interview_attempts')
            .update({ feedback: feedbackResult, score: feedbackResult.score })
            .eq('id', attempt.id);
        
        if (updateError) {
            console.error(`Failed to update attempt ${attempt.id}:`, updateError.message);
        } else {
            totalScore += feedbackResult.score;
            processedAttempts.push({ ...attempt, feedback: feedbackResult, score: feedbackResult.score });
        }
    }

    // 3. Generate the overall summary
    const overallScore = Math.round(totalScore / processedAttempts.length);
    const summaryResult = await summarizeInterviewPerformance({
        feedbacks: processedAttempts.map(p => ({
            questionText: p.questions?.text || '',
            score: p.score || 0,
            strengths: p.feedback?.strengths || '',
            weaknesses: p.feedback?.weaknesses || '',
        }))
    });

    // 4. Update the parent session with the final results
    const { error: sessionUpdateError } = await supabase
        .from('interview_sessions')
        .update({
            status: 'completed',
            overall_score: overallScore,
            summary: summaryResult,
        })
        .eq('id', sessionId);

    if (sessionUpdateError) {
        throw new Error(`Failed to update final session ${sessionId}: ${sessionUpdateError.message}`);
    }

    // 5. Send completion email
    try {
        const userId = attempts[0].user_id;
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

        if (userError) throw userError;

        if (user && user.email) {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
            await sendInterviewCompletedEmail({
                name: profile?.full_name || user.user_metadata?.full_name || 'User',
                email: user.email,
                sessionId: sessionId,
                overallScore: overallScore,
            });
        }
    } catch (emailError: any) {
        // Log the error but don't fail the entire process if email fails
        console.error(`Failed to send completion email for session ${sessionId}:`, emailError.message);
    }
}
