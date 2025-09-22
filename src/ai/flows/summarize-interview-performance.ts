'use server';

/**
 * @fileOverview Summarizes interview performance based on AI feedback.
 *
 * - summarizeInterviewPerformance - A function that summarizes interview performance.
 * - SummarizeInterviewPerformanceInput - The input type for the summarizeInterviewPerformance function.
 * - SummarizeInterviewPerformanceOutput - The return type for the summarizeInterviewPerformance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeInterviewPerformanceInputSchema = z.object({
  feedback: z.string().describe('The AI-generated feedback on the interview.'),
});
export type SummarizeInterviewPerformanceInput = z.infer<
  typeof SummarizeInterviewPerformanceInputSchema
>;

const SummarizeInterviewPerformanceOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the interview performance.'),
});
export type SummarizeInterviewPerformanceOutput = z.infer<
  typeof SummarizeInterviewPerformanceOutputSchema
>;

export async function summarizeInterviewPerformance(
  input: SummarizeInterviewPerformanceInput
): Promise<SummarizeInterviewPerformanceOutput> {
  return summarizeInterviewPerformanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeInterviewPerformancePrompt',
  input: {schema: SummarizeInterviewPerformanceInputSchema},
  output: {schema: SummarizeInterviewPerformanceOutputSchema},
  prompt: `You are an expert interview coach. Summarize the following feedback into key areas of improvement:

Feedback: {{{feedback}}}

Focus on providing actionable insights that the user can implement to improve their interview skills.`,
});

const summarizeInterviewPerformanceFlow = ai.defineFlow(
  {
    name: 'summarizeInterviewPerformanceFlow',
    inputSchema: SummarizeInterviewPerformanceInputSchema,
    outputSchema: SummarizeInterviewPerformanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
