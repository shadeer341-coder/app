
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
    
    // Find the user by email
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, raw_user_meta_data')
        .eq('email', userEmail)
        .single();
    
    // Always return a success message to prevent user enumeration attacks
    if (userError || !user) {
        console.warn(`Password reset requested for non-existent user: ${userEmail}`);
        return { success: true, message: "If an account with this email exists, a password reset code has been sent." };
    }

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store the token in the database
    const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert({
            user_id: user.id,
            token: code,
            expires_at: expires_at.toISOString(),
        });
    
    if (tokenError) {
        console.error('Error storing password reset token:', tokenError);
        return { success: false, message: 'Could not generate a reset code. Please try again.' };
    }
    
    const userName = (user.raw_user_meta_data as any)?.full_name || 'User';

    // Send the email with the code
    const emailResult = await sendPasswordResetEmail({
        name: userName,
        email: userEmail,
        code: code,
    });

    if (!emailResult.success) {
        return { success: false, message: emailResult.message };
    }

    return { success: true, message: "If an account with this email exists, a password reset code has been sent." };
}


const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Code must be 6 digits."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function resetPassword(input: z.infer<typeof resetPasswordSchema>) {
    const validated = resetPasswordSchema.safeParse(input);
    if (!validated.success) {
        return { success: false, message: "Invalid input." };
    }
    const { email, code, password } = validated.data;

    const supabase = createSupabaseServiceRoleClient();

    // 1. Find user by email
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

    if (userError || !user) {
        return { success: false, message: "Invalid code or email." };
    }

    // 2. Find the reset token
    const { data: token, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('token', code)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (tokenError || !token) {
        return { success: false, message: "Invalid or expired code." };
    }

    // 3. Check if token is expired
    if (new Date(token.expires_at) < new Date()) {
        return { success: false, message: "This reset code has expired. Please request a new one." };
    }

    // 4. Update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: password }
    );

    if (updateError) {
        console.error("Failed to update user password:", updateError);
        return { success: false, message: "Failed to update your password. Please try again." };
    }

    // 5. Delete the used token
    const { error: deleteError } = await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('id', token.id);

    if (deleteError) {
        console.warn(`Password reset for user ${user.id} was successful, but failed to delete the token.`, deleteError);
    }
    
    return { success: true, message: "Password has been reset successfully." };
}
