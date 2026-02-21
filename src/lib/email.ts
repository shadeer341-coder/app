
'use server';

import { Resend } from 'resend';
import { render } from '@react-email/render';
import WelcomeEmail from '@/emails/welcome';
import ResetPasswordEmail from '@/emails/reset-password';
import InterviewSubmittedEmail from '@/emails/interview-submitted';
import RechargeConfirmationEmail from '@/emails/recharge-confirmation';
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

export async function sendInterviewSubmittedEmail({ name, email, sessionId }: { name: string; email: string; sessionId: string; }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Skipping sending interview submission email.");
    return { success: false, message: 'Email provider is not configured.' };
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Interview Submitted for Processing',
      html: render(React.createElement(InterviewSubmittedEmail, { name, sessionId, submittedAt: new Date() })),
    });
    return { success: true, message: 'Interview submission confirmation sent.' };
  } catch (error: any) {
    console.error("Failed to send interview submission email:", error);
    return { success: false, message: error.message };
  }
}

export async function sendRechargeConfirmationEmail({ name, email, attemptsAdded, newQuota, isAgency }: { name: string; email: string; attemptsAdded: number; newQuota: number; isAgency: boolean; }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Skipping sending recharge email.");
    return { success: false, message: 'Email provider is not configured.' };
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Your Quota Has Been Recharged!',
      html: render(React.createElement(RechargeConfirmationEmail, { name, attemptsAdded, newQuota, isAgency })),
    });
    return { success: true, message: 'Recharge confirmation sent.' };
  } catch (error: any) {
    console.error("Failed to send recharge confirmation email:", error);
    return { success: false, message: error.message };
  }
}
