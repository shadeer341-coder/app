
'use server';

import { Resend } from 'resend';
import { render } from '@react-email/render';
import WelcomeEmail from '@/emails/welcome';
import ResetPasswordEmail from '@/emails/reset-password';
import * as React from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = 'precasprep <noreply@app.precasprep.com>';

export async function sendWelcomeEmail({ name, email, plan, tempPassword }: { name: string; email: string; plan: string; tempPassword: string; }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Skipping sending welcome email.");
    return { success: false, message: 'Email provider is not configured.' };
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Welcome to precasprep!',
      html: render(React.createElement(WelcomeEmail, { name, email, plan, tempPassword })),
    });
    return { success: true, message: 'Welcome email sent.' };
  } catch (error: any) {
    console.error("Failed to send welcome email:", error);
    return { success: false, message: error.message };
  }
}

export async function sendPasswordResetEmail({ name, email, code }: { name: string, email: string, code: string }) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not set. Skipping sending password reset email.");
        return { success: false, message: 'Email provider is not configured.' };
    }

    try {
        await resend.emails.send({
            from: fromEmail,
            to: [email],
            subject: 'Your precasprep Password Reset Code',
            html: render(React.createElement(ResetPasswordEmail, { name, code })),
        });
        return { success: true, message: 'Password reset email sent.' };
    } catch (error: any) {
        console.error("Failed to send password reset email:", error);
        return { success: false, message: error.message };
    }
}
