
'use server';

import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { generateInterviewFeedback, type GenerateInterviewFeedbackInput } from "@/ai/flows/generate-interview-feedback";
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
        const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('id, text, tags')
            .in('id', interviewData.map(d => d.questionId));

        if (questionsError) throw questionsError;

        for (const attempt of interviewData) {
            const question = questions.find(q => q.id === attempt.questionId);
            if (!question) {
                console.warn(`Question with ID ${attempt.questionId} not found. Skipping.`);
                continue;
            }
            
            const { transcript, snapshots } = attempt;
            
            const feedbackInput: GenerateInterviewFeedbackInput = {
                transcript: transcript,
                questionText: question.text,
                questionTags: question.tags || [],
                snapshots: snapshots,
            };

            const feedback = await generateInterviewFeedback(feedbackInput);

            const { error } = await supabase
                .from('interview_attempts')
                .insert({
                    user_id: user.id,
                    question_id: question.id,
                    transcript: transcript,
                    snapshots: snapshots,
                    feedback: feedback,
                    score: feedback.score,
                });

            if (error) {
                console.error("Error saving interview attempt to DB:", error);
                throw new Error(`Could not save attempt for question ID ${question.id}: ${error.message}`);
            }
        }
        
        revalidatePath('/dashboard/interviews');
        return { success: true, message: "Interview submitted successfully." };

    } catch (error: any) {
        console.error("An error occurred during interview submission:", error);
        return { success: false, message: error.message || "An unknown error occurred." };
    }
}
