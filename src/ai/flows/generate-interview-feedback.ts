
'use server';

import OpenAI from 'openai';
import { z } from 'zod';

const FeedbackInputSchema = z.object({
  transcript: z.string().describe("The user's transcribed answer to the interview question."),
  questionText: z.string().describe("The text of the interview question that was asked."),
  questionTags: z.array(z.string()).optional().describe("A list of keywords or concepts expected in the answer."),
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

async function analyzeTranscript(transcript: string, questionText: string, questionTags: string[] | undefined) {
    const prompt = `
        You are an expert interview coach. Analyze the following interview answer based *only* on the text provided.
        The user was asked: "${questionText}"
        The user's answer: "${transcript}"
        Expected keywords: ${questionTags?.join(', ') || "None specified."}

        Provide a concise and constructive feedback report in a JSON object with the following fields:
        - "strengths": "Specific strengths of the answer's content and structure."
        - "weaknesses": "Specific weaknesses or areas for improvement in the answer's content."
        - "grammarFeedback": "Feedback on grammar, clarity, and use of filler words."
        - "overallPerformance": "A summary of the textual performance."
        - "score": A score from 0 to 100 based on answer quality (70%) and keyword usage (30%).

        Do not include any other text or formatting.
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1000,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0].message?.content;
    if (!content) throw new Error("Transcript analysis API returned empty response.");
    return JSON.parse(content);
}

export async function analyzeSnapshots(snapshots: string[]) {
    const prompt = `
        You are a visual presentation coach. Analyze the user's visual presentation from the provided snapshots.
        Focus on lighting, framing (is the user centered?), eye contact (are they looking towards the camera?), and overall professionalism of the background.
        Provide a concise feedback summary in a JSON object with two fields:
        - "visualFeedback": "A summary of the visual presentation quality. Focus on lighting, face appearance, framing, eye contact and background."
        - "visualScore": A score from 0 to 100 based on the visual factors.

        Do not include any other text or formatting.
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [{
            role: "user",
            content: [
                { type: "text", text: prompt },
                ...snapshots.map(snapshot => ({
                    type: "image_url" as const,
                    image_url: { url: snapshot, detail: "low" as const },
                })),
            ],
        }],
    });
    
    const content = response.choices[0].message?.content;
    if (!content) throw new Error("Snapshot analysis API returned empty response.");
    return JSON.parse(content);
}


export async function generateInterviewFeedback(
  input: GenerateInterviewFeedbackInput
): Promise<GenerateInterviewFeedbackOutput> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured.');
  }

  const { transcript, questionText, questionTags } = FeedbackInputSchema.parse(input);

  try {
    const transcriptResult = await analyzeTranscript(transcript, questionText, questionTags);

    return FeedbackOutputSchema.parse({
      strengths: transcriptResult.strengths,
      weaknesses: transcriptResult.weaknesses,
      grammarFeedback: transcriptResult.grammarFeedback,
      overallPerformance: transcriptResult.overallPerformance,
      score: transcriptResult.score,
    });

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
