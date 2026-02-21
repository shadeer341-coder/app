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
    
    // This is the correct production URL for the password update page.
    const redirectTo = 'https://app.precasprep.com/update-password';
    
    // Generate a single-use recovery link from Supabase.
    const { data, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: userEmail,
        options: { redirectTo } // We still pass redirectTo here as a fallback.
    });

    if (linkError) {
        console.error(`Error generating password reset link for ${userEmail}:`, linkError.message);
        return { success: true, message: "If an account with this email exists, a password reset link has been sent." };
    }

    const { properties, user } = data;
    const originalResetLink = properties.action_link;
    const userName = user.user_metadata?.full_name || 'User';

    // Manually ensure the 'redirect_to' parameter in the link is correct.
    // This provides an extra layer of certainty that the link will work in production,
    // even if there are misconfigurations in the Supabase project's URL settings.
    const url = new URL(originalResetLink);
    url.searchParams.set('redirect_to', redirectTo);
    const finalResetLink = url.toString();


    // Send the email with the corrected link.
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
