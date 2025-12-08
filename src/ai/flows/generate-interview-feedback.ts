'use server';

/**
 * @fileOverview AI-driven feedback generation for interview attempts.
 * This functionality is temporarily disabled.
 */

export type GenerateInterviewFeedbackInput = any;
export type GenerateInterviewFeedbackOutput = any;

export async function generateInterviewFeedback(
  input: GenerateInterviewFeedbackInput
): Promise<GenerateInterviewFeedbackOutput> {
  console.log("generateInterviewFeedback is temporarily disabled.");
  return {
    strengths: "Temporarily disabled.",
    weaknesses: "Temporarily disabled.",
    grammarFeedback: "Temporarily disabled.",
    overallPerformance: "Temporarily disabled.",
  }
}
