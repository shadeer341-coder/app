
'use server';

import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type AttemptDataItem = {
    questionId: number;
    transcript: string;
    snapshots: string[];
};

// This function only saves the raw data. The AI processing will be handled by a separate cron job.
export async function submitInterview(interviewData: AttemptDataItem[]) {
    const supabase = createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "User not authenticated." };
    }

    try {
        // 1. Create a new interview session with a 'pending' status
        const { data: session, error: sessionError } = await supabase
            .from('interview_sessions')
            .insert({ 
                user_id: user.id,
                status: 'pending' // Set initial status
            })
            .select()
            .single();
        
        if (sessionError) throw new Error(`Could not create interview session: ${sessionError.message}`);

        // 2. Save each attempt linked to the new session
        for (const attempt of interviewData) {
            const { error: attemptError } = await supabase
                .from('interview_attempts')
                .insert({
                    user_id: user.id,
                    session_id: session.id,
                    question_id: attempt.questionId,
                    transcript: attempt.transcript,
                    snapshots: attempt.snapshots,
                });

            if (attemptError) {
                // If an attempt fails, log it and continue. Consider a more robust retry/cleanup later.
                console.error(`Error saving attempt for question ID ${attempt.questionId}:`, attemptError.message);
            }
        }
        
        revalidatePath('/dashboard/interviews');
        return { success: true, message: "Interview submitted for processing.", sessionId: session.id };

    } catch (error: any) {
        console.error("An error occurred during interview submission:", error);
        return { success: false, message: error.message || "An unknown error occurred." };
    }
}
