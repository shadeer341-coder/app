'use server';

/**
 * @fileOverview AI-driven question suggestion for admins.
 *
 * - suggestQuestion - A function that suggests an interview question based on a category.
 * - SuggestQuestionInput - The input type for the suggestQuestion function.
 * - SuggestQuestionOutput - The return type for the suggestQuestion function.
 */

import {ai} from '@/ai/genkit';
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
  // return suggestQuestionFlow(input);
  console.log("AI question suggestion is temporarily disabled.");
  return { suggestion: "AI suggestion is temporarily disabled. Please enter a question manually." };
}

// const prompt = ai.definePrompt({
//   name: 'suggestQuestionPrompt',
//   input: {schema: SuggestQuestionInputSchema},
//   output: {schema: SuggestQuestionOutputSchema},
//   prompt: `You are an expert curriculum developer for interview preparation.
  
//   Generate one high-quality, open-ended interview question appropriate for the following category: {{{categoryName}}}.

//   The question should be clear, concise, and designed to elicit a detailed response from a candidate. Do not include any preamble or explanation, just the question text.`,
// });

// const suggestQuestionFlow = ai.defineFlow(
//   {
//     name: 'suggestQuestionFlow',
//     inputSchema: SuggestQuestionInputSchema,
//     outputSchema: SuggestQuestionOutputSchema,
//   },
//   async input => {
//     const {output} = await ai.generate({
//       prompt: (await prompt.render(input)).prompt,
//       output: {
//         format: 'json',
//         schema: SuggestQuestionOutputSchema
//       }
//     });

//     return output!;
//   }
// );
