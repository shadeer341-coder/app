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
    
    // Generate a single-use recovery link from Supabase, relying on the `redirectTo` option.
    // This is the standard method and should be respected if the Supabase project's
    // URL allow-list is configured correctly.
    const { data, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: userEmail,
        options: { redirectTo }
    });

    if (linkError) {
        console.error(`Error generating password reset link for ${userEmail}:`, linkError.message);
        // Do not leak information about whether a user exists.
        return { success: true, message: "If an account with this email exists, a password reset link has been sent." };
    }

    const { properties, user } = data;
    const finalResetLink = properties.action_link;
    const userName = user.user_metadata?.full_name || 'User';

    const emailResult = await sendPasswordResetEmail({
        name: userName,
        email: userEmail,
        resetLink: finalResetLink,
    });

    if (!emailResult.success) {
        return { success: false, message: emailResult.message };
    }

    return { success: true, message: "If an account with this email exists, a password reset link has been sent." };
}
