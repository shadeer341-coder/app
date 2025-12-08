'use server';

/**
 * @fileOverview AI-driven question suggestion for admins.
 *
 * - suggestQuestion - A function that suggests an interview question based on a category.
 * - SuggestQuestionInput - The input type for the suggestQuestion function.
 * - SuggestQuestionOutput - The return type for the suggestQuestion function.
 */

import {z} from 'zod';

const SuggestQuestionInputSchema = z.object({
  categoryName: z.string().describe('The name of the interview question category.'),
});
export type SuggestQuestionInput = z.infer<
  typeof SuggestQuestionInputSchema
>;

const SuggestQuestionOutputSchema = z.object({
  suggestion: z.string().describe('The suggested interview question.'),
});
export type SuggestQuestionOutput = z.infer<
  typeof SuggestQuestionOutputSchema
>;

export async function suggestQuestion(
  input: SuggestQuestionInput
): Promise<SuggestQuestionOutput> {
  // This feature is temporarily disabled to resolve build issues.
  return { suggestion: "AI suggestion is temporarily disabled. Please enter a question manually." };
}
