'use server';

import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { generateInterviewFeedback, type GenerateInterviewFeedbackInput } from "@/ai/flows/generate-interview-feedback";
import { summarizeInterviewPerformance } from "@/ai/flows/summarize-interview-performance";
import { revalidatePath } from "next/cache";

type AttemptDataItem = {
    questionId: number;
    transcript: string;
    snapshots: string[];
};

export async function submitInterview(interviewData: AttemptDataItem[]) {
    const supabase = createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "User not authenticated." };
    }

    try {
        // 1. Create a new interview session
        const { data: session, error: sessionError } = await supabase
            .from('interview_sessions')
            .insert({ user_id: user.id })
            .select()
            .single();
        
        if (sessionError) throw new Error(`Could not create interview session: ${sessionError.message}`);

        // 2. Fetch all questions at once
        const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('id, text, tags')
            .in('id', interviewData.map(d => d.questionId));

        if (questionsError) throw questionsError;

        let totalScore = 0;
        const individualFeedbacks = [];

        // 3. Process each attempt
        for (const attempt of interviewData) {
            const question = questions.find(q => q.id === attempt.questionId);
            if (!question) {
                console.warn(`Question with ID ${attempt.questionId} not found. Skipping.`);
                continue;
            }
            
            // 3a. Generate individual feedback
            const feedbackInput: GenerateInterviewFeedbackInput = {
                transcript: attempt.transcript,
                questionText: question.text,
                questionTags: question.tags || [],
                snapshots: attempt.snapshots,
            };
            const feedback = await generateInterviewFeedback(feedbackInput);
            totalScore += feedback.score;

            individualFeedbacks.push({
                questionText: question.text,
                score: feedback.score,
                strengths: feedback.strengths,
                weaknesses: feedback.weaknesses,
            });

            // 3b. Save the individual attempt to the database
            const { error: attemptError } = await supabase
                .from('interview_attempts')
                .insert({
                    user_id: user.id,
                    session_id: session.id, // Link to the session
                    question_id: question.id,
                    transcript: attempt.transcript,
                    snapshots: attempt.snapshots,
                    feedback: feedback,
                    score: feedback.score,
                });

            if (attemptError) {
                console.error("Error saving interview attempt to DB:", attemptError);
                throw new Error(`Could not save attempt for question ID ${question.id}: ${attemptError.message}`);
            }
        }

        if (interviewData.length === 0) {
             return { success: false, message: "No interview data to submit." };
        }
        
        // 4. Generate overall summary
        const summary = await summarizeInterviewPerformance({ feedbacks: individualFeedbacks });
        const overallScore = Math.round(totalScore / interviewData.length);
        
        // 5. Update the session with the summary and overall score
        const { error: updateSessionError } = await supabase
            .from('interview_sessions')
            .update({
                overall_score: overallScore,
                summary: summary,
            })
            .eq('id', session.id);
            
        if (updateSessionError) {
            throw new Error(`Could not update session with summary: ${updateSessionError.message}`);
        }
        
        revalidatePath('/dashboard/interviews');
        return { success: true, message: "Interview submitted successfully.", sessionId: session.id };

    } catch (error: any) {
        console.error("An error occurred during interview submission:", error);
        return { success: false, message: error.message || "An unknown error occurred." };
    }
}
