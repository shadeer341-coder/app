
'use server';

import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { generateInterviewFeedback, type GenerateInterviewFeedbackInput } from "@/ai/flows/generate-interview-feedback";
import type { Question } from "@/lib/types";
import { revalidatePath } from "next/cache";

type AttemptDataItem = {
    questionId: number;
    transcript: string;
    snapshots: string[];
};

type FullInterviewDataItem = {
    question: Pick<Question, 'id' | 'text' | 'tags'>;
    attempt: AttemptDataItem;
};

export async function submitInterview(fullInterviewData: FullInterviewDataItem[]) {
    const supabase = createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "User not authenticated." };
    }

    try {
        for (const item of fullInterviewData) {
            const { question, attempt } = item;
            
            // The transcript is now passed in directly.
            const { transcript, snapshots } = attempt;
            
            // 1. Generate AI Feedback
            const feedbackInput: GenerateInterviewFeedbackInput = {
                transcript: transcript,
                questionText: question.text,
                questionTags: question.tags || [],
                snapshots: snapshots,
            };

            const feedback = await generateInterviewFeedback(feedbackInput);

            // 2. Save to database
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
