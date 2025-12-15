'use server';

import OpenAI from 'openai';
import { z } from 'zod';
import type { GenerateInterviewFeedbackOutput } from './generate-interview-feedback';

const SummarizeInputSchema = z.object({
  feedbacks: z.array(
    z.object({
      questionText: z.string(),
      score: z.number(),
      strengths: z.string(),
      weaknesses: z.string(),
    })
  ),
});

const SummarizeOutputSchema = z.object({
    overallStrengths: z.string().describe("Common themes and key strengths observed across all answers."),
    overallWeaknesses: z.string().describe("Recurring weaknesses or areas for improvement seen in multiple answers."),
    finalTips: z.string().describe("A final set of actionable tips for the user to focus on for future interviews."),
});

export type SummarizeInterviewPerformanceInput = z.infer<typeof SummarizeInputSchema>;
export type SummarizeInterviewPerformanceOutput = z.infer<typeof SummarizeOutputSchema>;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function summarizeInterviewPerformance(
  input: SummarizeInterviewPerformanceInput
): Promise<SummarizeInterviewPerformanceOutput> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured.');
  }

  const { feedbacks } = SummarizeInputSchema.parse(input);

  const analysisPrompt = `
    You are an expert interview coach summarizing a user's performance across an entire interview session.
    You will be given a series of feedback reports from individual questions. Your task is to synthesize this information
    into a high-level summary. Do not just repeat the individual feedback; instead, identify patterns, common themes, and overarching trends.

    Here is the feedback from each question:
    ${feedbacks.map((f, i) => `
    ---
    Question ${i + 1}: "${f.questionText}" (Score: ${f.score}/100)
    Strengths: ${f.strengths}
    Weaknesses: ${f.weaknesses}
    ---
    `).join('\n')}

    Based on all of this, provide a final summary report. Look for recurring strengths you can praise and common weaknesses that need addressing.
    Provide a final set of actionable tips.

    Return the summary in a JSON object with the following structure: { "overallStrengths": "...", "overallWeaknesses": "...", "finalTips": "..." }
    Do not include any other text or formatting.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
    });

    const summaryJson = response.choices[0].message?.content;
    if (!summaryJson) {
      throw new Error('API returned an empty summary response.');
    }
    
    const parsedSummary = JSON.parse(summaryJson);
    return SummarizeOutputSchema.parse(parsedSummary);

  } catch (error) {
    console.error('Error generating interview summary with OpenAI:', error);
    return {
      overallStrengths: "Could not generate an overall summary.",
      overallWeaknesses: "An error occurred during final analysis.",
      finalTips: "Please review individual feedback for more details.",
    };
  }
}
