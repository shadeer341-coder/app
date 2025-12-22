
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateInterviewFeedback, analyzeSnapshots } from '@/ai/flows/generate-interview-feedback';
import { summarizeInterviewPerformance } from '@/ai/flows/summarize-interview-performance';
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
    const firstAttemptWithSnapshots = attempts.find(a => a.snapshots && a.snapshots.length > 0);
    let visualAnalysisResult: { visualFeedback: string, visualScore: number } | null = null;
    
    // Run visual analysis if snapshots exist
    if (firstAttemptWithSnapshots?.snapshots) {
        visualAnalysisResult = await analyzeSnapshots(firstAttemptWithSnapshots.snapshots);
    }

    for (const attempt of attempts) {
        const feedbackResult = await generateInterviewFeedback({
            transcript: attempt.transcript,
            questionText: attempt.questions?.text || '',
            questionTags: attempt.questions?.tags || [],
        });
        
        let finalScore = feedbackResult.score;

        // If this is the first attempt and visual feedback exists, factor it into the score
        if (attempt.id === firstAttemptWithSnapshots?.id && visualAnalysisResult) {
            finalScore = Math.round((feedbackResult.score * 0.7) + (visualAnalysisResult.visualScore * 0.3));
        }

        const { error: updateError } = await supabase
            .from('interview_attempts')
            .update({ feedback: feedbackResult, score: finalScore })
            .eq('id', attempt.id);
        
        if (updateError) {
            console.error(`Failed to update attempt ${attempt.id}:`, updateError.message);
        } else {
            totalScore += finalScore;
            processedAttempts.push({ ...attempt, feedback: feedbackResult, score: finalScore });
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
            visual_feedback: visualAnalysisResult,
        })
        .eq('id', sessionId);

    if (sessionUpdateError) {
        throw new Error(`Failed to update final session ${sessionId}: ${sessionUpdateError.message}`);
    }
}
