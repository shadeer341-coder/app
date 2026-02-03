
'use server';

import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type AttemptDataItem = {
    questionId: number;
    transcript: string;
    snapshots: string[];
};

export async function startInterview() {
    const supabase = createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "User not authenticated." };
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('interview_quota, role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        return { success: false, message: "Could not retrieve user profile." };
    }

    // Only enforce quota for non-admin roles
    if (profile.role !== 'admin' && (profile.interview_quota === null || profile.interview_quota <= 0)) {
        return { success: false, message: "You have no remaining interview attempts." };
    }


    try {
        // Decrement quota for non-admin roles
        if (profile.role !== 'admin') {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ interview_quota: (profile.interview_quota || 0) - 1 })
                .eq('id', user.id);

            if (updateError) {
                throw new Error(`Failed to update quota: ${updateError.message}`);
            }
        }
        
        // Create a new interview session with a 'pending' status but no process_at time
        const { data: session, error: sessionError } = await supabase
            .from('interview_sessions')
            .insert({ 
                user_id: user.id,
                status: 'pending',
            })
            .select('id')
            .single();
        
        if (sessionError) {
            // Ideally, we'd roll back the quota decrement here.
            // For now, log a critical error.
            console.error(`CRITICAL: Quota consumed for user ${user.id} but session creation failed.`, sessionError);
            throw new Error(`Could not create interview session: ${sessionError.message}`);
        }

        revalidatePath('/dashboard/practice');
        revalidatePath('/dashboard');
        
        return { success: true, sessionId: session.id };

    } catch (error: any) {
        console.error("An error occurred during interview start:", error);
        return { success: false, message: error.message || "An unknown error occurred." };
    }
}


// This function now takes a session ID and saves the raw data.
export async function submitInterview(sessionId: string, interviewData: AttemptDataItem[]) {
    const supabase = createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "User not authenticated." };
    }

    // Verify session ownership
     const { data: session, error: sessionError } = await supabase
        .from('interview_sessions')
        .select('id, user_id')
        .eq('id', sessionId)
        .single();
    
    if (sessionError || !session || session.user_id !== user.id) {
        return { success: false, message: "Invalid session or permission denied." };
    }

    try {
        // 1. Save each attempt linked to the session
        for (const attempt of interviewData) {
            const { error: attemptError } = await supabase
                .from('interview_attempts')
                .insert({
                    user_id: user.id,
                    session_id: sessionId,
                    question_id: attempt.questionId,
                    transcript: attempt.transcript,
                    snapshots: attempt.snapshots,
                });

            if (attemptError) {
                console.error(`Error saving attempt for question ID ${attempt.questionId}:`, attemptError.message);
            }
        }
        
        // 2. Schedule the session for processing by setting `process_at`
        const twentyMinutesFromNow = new Date(Date.now() + 20 * 60 * 1000).toISOString();
        const { error: updateError } = await supabase
            .from('interview_sessions')
            .update({ process_at: twentyMinutesFromNow })
            .eq('id', sessionId);
        
        if (updateError) throw new Error(`Could not schedule interview for processing: ${updateError.message}`);

        revalidatePath('/dashboard/interviews');
        return { success: true, message: "Interview submitted for processing.", sessionId: sessionId };

    } catch (error: any) {
        console.error("An error occurred during interview submission:", error);
        return { success: false, message: error.message || "An unknown error occurred." };
    }
}
