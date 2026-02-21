'use server';

import { z } from 'zod';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { sendPasswordResetEmail } from '@/lib/email';

const emailSchema = z.string().email();

export async function requestPasswordReset(email: string) {
    const validatedEmail = emailSchema.safeParse(email);
    if (!validatedEmail.success) {
        return { success: false, message: 'Invalid email address.' };
    }
    const userEmail = validatedEmail.data;

    const supabase = createSupabaseServiceRoleClient();
    
    const redirectTo = 'https://app.precasprep.com/update-password';
    
    // Generate single-use recovery link
    // This also serves to check if the user exists.
    const { data, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: userEmail,
        options: { redirectTo }
    });

    if (linkError) {
        // Don't reveal if user exists or not for security reasons.
        // Log the error server-side and return a generic success message.
        console.error(`Error generating password reset link for ${userEmail}:`, linkError.message);
        return { success: true, message: "If an account with this email exists, a password reset link has been sent." };
    }

    const { properties, user } = data;
    const resetLink = properties.action_link;
    const userName = user.user_metadata?.full_name || 'User';

    // Send email via Resend
    const emailResult = await sendPasswordResetEmail({
        name: userName,
        email: userEmail,
        resetLink,
    });

    if (!emailResult.success) {
        // If email fails, the user won't get the link. Return an error.
        return { success: false, message: emailResult.message };
    }

    return { success: true, message: "If an account with this email exists, a password reset link has been sent." };
}
