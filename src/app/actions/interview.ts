
'use server';

import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendInterviewSubmittedEmail } from "@/lib/email";

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

    // 1. Check if there is already a pending session that hasn't been scheduled for processing
    const { data: existingSession } = await supabase
        .from('interview_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .is('process_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (existingSession) {
        return { success: true, sessionId: existingSession.id, resumed: true };
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
            console.error(`CRITICAL: Quota consumed for user ${user.id} but session creation failed.`, sessionError);
            throw new Error(`Could not create interview session: ${sessionError.message}`);
        }

        revalidatePath('/dashboard/practice');
        revalidatePath('/dashboard');
        
        return { success: true, sessionId: session.id, resumed: false };

    } catch (error: any) {
        console.error("An error occurred during interview start:", error);
        return { success: false, message: error.message || "An unknown error occurred." };
    }
}

/**
 * Saves a single attempt incrementally during the interview.
 * This allows the user to resume if they disconnect.
 */
export async function saveInterviewAttempt(sessionId: string, attempt: AttemptDataItem) {
    const supabase = createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: "Unauthenticated" };

    const { error } = await supabase
        .from('interview_attempts')
        .upsert({
            user_id: user.id,
            session_id: sessionId,
            question_id: attempt.questionId,
            transcript: attempt.transcript,
            snapshots: attempt.snapshots,
        }, { onConflict: 'session_id, question_id' });

    if (error) {
        console.error("Error saving incremental attempt:", error.message);
        return { success: false, message: error.message };
    }

    return { success: true };
}


// This function now marks the session as complete and schedules processing.
export async function submitInterview(sessionId: string) {
    const supabase = createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "User not authenticated." };
    }

    // Verify session ownership and ensure it has attempts
    const { data: attempts } = await supabase
        .from('interview_attempts')
        .select('id')
        .eq('session_id', sessionId);

    if (!attempts || attempts.length === 0) {
        return { success: false, message: "Cannot submit an empty interview." };
    }

    try {
        // Schedule the session for processing by setting `process_at`
        const twentyMinutesFromNow = new Date(Date.now() + 20 * 60 * 1000).toISOString();
        const { error: updateError } = await supabase
            .from('interview_sessions')
            .update({ process_at: twentyMinutesFromNow })
            .eq('id', sessionId);
        
        if (updateError) throw new Error(`Could not schedule interview for processing: ${updateError.message}`);

        // Fetch user profile to get the user's name for the email
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();

        // Send confirmation email
        const emailResult = await sendInterviewSubmittedEmail({
            name: profile?.full_name || user.user_metadata?.full_name || 'User',
            email: user.email!,
            sessionId: sessionId,
        });

        if (!emailResult.success) {
            console.warn(`Interview submitted, but confirmation email failed to send for session ${sessionId}. Reason: ${emailResult.message}`);
        }

        revalidatePath('/dashboard/interviews');
        return { success: true, message: "Interview submitted for processing.", sessionId: sessionId };

    } catch (error: any) {
        console.error("An error occurred during interview submission:", error);
        return { success: false, message: error.message || "An unknown error occurred." };
    }
}
