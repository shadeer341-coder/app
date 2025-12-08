'use server';

/**
 * @fileOverview AI-driven feedback generation for interview attempts.
 *
 * - generateInterviewFeedback - A function that generates feedback on interview attempts.
 * - GenerateInterviewFeedbackInput - The input type for the generateInterviewFeedback function.
 * - GenerateInterviewFeedbackOutput - The return type for the generateInterviewFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateInterviewFeedbackInputSchema = z.object({
  interviewRecordingDataUri: z
    .string()
    .describe(
      "The interview recording as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  interviewTranscript: z.string().describe('The transcript of the interview.'),
  userDetails: z.string().describe('Details about the user, such as level and role.'),
  questionDetails: z.string().describe('Details about the question asked during the interview.'),
  overallScore: z.number().describe('The overall score given to the interview.'),
});
export type GenerateInterviewFeedbackInput = z.infer<
  typeof GenerateInterviewFeedbackInputSchema
>;

const GenerateInterviewFeedbackOutputSchema = z.object({
  strengths: z.string().describe('The strengths demonstrated during the interview.'),
  weaknesses: z.string().describe('The weaknesses demonstrated during the interview.'),
  grammarFeedback: z.string().describe('Feedback on the grammar used during the interview.'),
  overallPerformance: z.string().describe('An overall assessment of the interview performance.'),
});
export type GenerateInterviewFeedbackOutput = z.infer<
  typeof GenerateInterviewFeedbackOutputSchema
>;

export async function generateInterviewFeedback(
  input: GenerateInterviewFeedbackInput
): Promise<GenerateInterviewFeedbackOutput> {
  // return generateInterviewFeedbackFlow(input);
  console.log("AI Feedback generation is temporarily disabled.");
  return {
    strengths: "AI feedback generation is temporarily disabled.",
    weaknesses: "AI feedback generation is temporarily disabled.",
    grammarFeedback: "AI feedback generation is temporarily disabled.",
    overallPerformance: "AI feedback generation is temporarily disabled.",
  }
}

// const isSufficientScore = ai.defineTool({
//   name: 'isSufficientScore',
//   description: 'Determine if the overall score of the interview is sufficient.',
//   inputSchema: z.object({
//     score: z.number().describe('The overall score of the interview.'),
//   }),
//   outputSchema: z.boolean().describe('Whether the score is sufficient or not.'),
// },
//   async (input) => {
//     // Define your logic for determining score sufficiency here.
//     // This is a placeholder implementation.
//     return input.score >= 70; // Example: score is sufficient if it's 70 or higher
//   }
// );

// const generateInterviewFeedbackPrompt = ai.definePrompt({
//   name: 'generateInterviewFeedbackPrompt',
//   tools: [isSufficientScore],
//   input: {schema: GenerateInterviewFeedbackInputSchema},
//   output: {schema: GenerateInterviewFeedbackOutputSchema},
//   prompt: `You are an AI-powered interview feedback generator. You analyze interview recordings and transcripts to provide feedback to users, helping them identify areas for improvement.

//   Here are the details of the interview:
//   - User Details: {{{userDetails}}}
//   - Question Details: {{{questionDetails}}}
//   - Interview Transcript: {{{interviewTranscript}}}
//   - Interview Recording: {{media url=interviewRecordingDataUri}}
//   - Overall Score: {{{overallScore}}}

//   Analyze the interview and provide the following feedback:
//   - Strengths: Highlight the strengths demonstrated during the interview.
//   - Weaknesses: Identify the weaknesses demonstrated during the interview.
//   - Grammar Feedback: Provide feedback on the grammar used during the interview.
//   - Overall Performance: Give an overall assessment of the interview performance.

//   Ensure the feedback is actionable and constructive. If the overall score is not sufficient, focus the feedback on areas needing improvement.

//   {{#if (isSufficientScore overallScore=overallScore)}}
//   The candidate has a sufficient score, and does not need significant improvements.
//   {{/if}}
//   `,
// });

// const generateInterviewFeedbackFlow = ai.defineFlow(
//   {
//     name: 'generateInterviewFeedbackFlow',
//     inputSchema: GenerateInterviewFeedbackInputSchema,
//     outputSchema: GenerateInterviewFeedbackOutputSchema,
//   },
//   async input => {
//     const {output} = await generateInterviewFeedbackPrompt(input);
//     return output!;
//   }
// );
