
'use server';

import OpenAI from 'openai';
import { z } from 'zod';

const FeedbackInputSchema = z.object({
  transcript: z.string().describe("The user's transcribed answer to the interview question."),
  questionText: z.string().describe("The text of the interview question that was asked."),
  questionTags: z.array(z.string()).optional().describe("A list of keywords or concepts expected in the answer."),
  snapshots: z.array(z.string()).describe("An array of Base64-encoded image snapshots of the user during the interview for visual analysis."),
});

const FeedbackOutputSchema = z.object({
  strengths: z.string().describe("Specific strengths of the user's answer and presentation."),
  weaknesses: z.string().describe("Specific weaknesses or areas for improvement in the user's answer and presentation."),
  grammarFeedback: z.string().describe("Feedback on the user's grammar, clarity, and use of filler words."),
  overallPerformance: z.string().describe("A summary of the overall performance."),
  score: z.number().int().min(0).max(100).describe("An overall score from 0 to 100 based on all factors."),
});

export type GenerateInterviewFeedbackInput = z.infer<typeof FeedbackInputSchema>;
export type GenerateInterviewFeedbackOutput = z.infer<typeof FeedbackOutputSchema>;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateInterviewFeedback(
  input: GenerateInterviewFeedbackInput
): Promise<GenerateInterviewFeedbackOutput> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured.');
  }

  const { transcript, questionText, questionTags, snapshots } = FeedbackInputSchema.parse(input);

  const hasSnapshots = snapshots && snapshots.length > 0;

  const analysisPrompt = `
    You are an expert interview coach providing feedback on an interview performance.
    Analyze the following information and provide structured feedback.

    The user was asked the following question: "${questionText}"
    The user's transcribed answer is: "${transcript}"
    
    The expected keywords and concepts for the answer were: ${questionTags && questionTags.length > 0 ? questionTags.join(', ') : "None specified."}
    
    ${hasSnapshots ? "Analyze the attached snapshots for visual presentation quality (e.g., lighting, framing, eye contact, facial clarity)." : "No snapshots were provided for visual analysis."}
    
    Based on all of this, provide a concise and constructive feedback report. The feedback should be direct and actionable.
    Calculate a score from 0 to 100.
    The final score should be based on:
    - Answer quality and relevance to the question (${hasSnapshots ? '40%' : '55%'})
    - Mention of keywords/tags (${hasSnapshots ? '30%' : '30%'})
    - Grammar and clarity of speech (${hasSnapshots ? '15%' : '15%'})
    ${hasSnapshots ? '- Visual presentation from snapshots (15%)' : ''}

    Return the feedback in a JSON object with the following structure: { "strengths": "...", "weaknesses": "...", "grammarFeedback": "...", "overallPerformance": "...", "score": ... }
    Do not include any other text or formatting.
  `;

  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{
        role: "user",
        content: [
          { type: "text", text: analysisPrompt },
          ...(hasSnapshots ? snapshots.map(snapshot => ({
            type: "image_url" as const,
            image_url: {
              url: snapshot,
              detail: "low" as const,
            },
          })) : []),
        ],
    }];
      
    const response = await openai.chat.completions.create({
      model: hasSnapshots ? "gpt-4-vision-preview" : "gpt-4-turbo-preview",
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: messages,
    });

    const feedbackJson = response.choices[0].message?.content;
    if (!feedbackJson) {
      throw new Error('API returned an empty feedback response.');
    }
    
    const parsedFeedback = JSON.parse(feedbackJson);
    return FeedbackOutputSchema.parse(parsedFeedback);

  } catch (error) {
    console.error('Error generating interview feedback with OpenAI:', error);
    // Provide a default error response that matches the schema
    return {
      strengths: "Could not generate feedback at this time.",
      weaknesses: "An error occurred during analysis.",
      grammarFeedback: "N/A",
      overallPerformance: "Analysis failed. Please try again.",
      score: 0,
    };
  }
}
