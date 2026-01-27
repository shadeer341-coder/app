
'use server';

import OpenAI from 'openai';
import { z } from 'zod';

const FeedbackInputSchema = z.object({
  transcript: z.string().describe("The user's transcribed answer to the interview question."),
  questionText: z.string().describe("The text of the interview question that was asked."),
  questionTags: z.array(z.string()).optional().nullable().describe("A list of keywords or concepts expected in the answer."),
  snapshots: z.array(z.string()).optional().describe("A list of image snapshots (as data URIs) captured during the answer for visual analysis."),
});

const FeedbackOutputSchema = z.object({
  strengths: z.string().describe("Specific strengths of the user's answer and presentation."),
  weaknesses: z.string().describe("Specific weaknesses or areas for improvement in the user's answer and presentation. This should be empty if all tags are covered."),
  grammarFeedback: z.string().describe("Feedback on the user's grammar, clarity, and use of filler words."),
  overallPerformance: z.string().describe("A summary of the overall performance."),
  score: z.number().int().min(0).max(100).describe("An overall score from 0 to 100 based on all factors."),
  visualFeedback: z.string().optional().describe("Feedback on visual elements, if applicable (e.g., passport verification)."),
});

export type GenerateInterviewFeedbackInput = z.infer<typeof FeedbackInputSchema>;
export type GenerateInterviewFeedbackOutput = z.infer<typeof FeedbackOutputSchema>;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeTranscript(transcript: string, questionText: string, questionTags: string[] | undefined | null) {
    const hasTags = questionTags && questionTags.length > 0;
    const prompt = `
        You are a strict interview evaluator. Your primary goal is to check if the user's answer includes specific concepts from a list of tags.
        The user was asked: "${questionText}"
        The user's answer: "${transcript}"
        ${hasTags ? `The answer *must* include and elaborate on the following concepts: **${questionTags!.join(', ')}**.` : "Analyze the answer for general quality and clarity."}

        Your task:
        1.  Analyze the transcript to see if it explicitly discusses all required concepts from the tags.
        2.  For the "strengths" field: 
            - If the answer covers all required concepts, state: "The answer perfectly covered all key points: ${questionTags!.join(', ')}."
            - Otherwise, mention which concepts were well-explained.
        3.  For the "weaknesses" field: 
            - If the answer is missing any of the required concepts, you MUST list the specific concepts the user failed to mention.
            - If all concepts are covered, this field MUST be an empty string "". This is critical.
        4.  For the "score" field: Base this score almost entirely on how many of the required concepts were successfully covered. A perfect answer that misses the keywords should get a low score. An answer that hits all keywords should get a high score.
        
        Provide the feedback in a JSON object with the following fields:
        - "strengths": "Positive feedback based on tag coverage."
        - "weaknesses": "If tags are missing, list them. If all tags are present, this MUST be an empty string."
        - "grammarFeedback": "Feedback on grammar, clarity, and use of filler words."
        - "overallPerformance": "A summary of the performance, focused on tag coverage."
        - "score": A score from 0 to 100, primarily based on keyword coverage.

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

async function analyzePassportVerification(snapshots: string[]) {
    const prompt = `
        You are an identity verification specialist. Your task is to analyze the provided snapshots to determine if the user is correctly presenting their passport for verification.

        Verification Criteria:
        1.  A passport-like document must be visible.
        2.  The user's face must be clearly visible and next to the passport.
        3.  Both the face and the passport should be reasonably well-lit and in focus.

        Analyze the snapshots and provide a score from 0 to 100 based on these criteria.
        - A score of 100 means a clear face is held next to a clear passport.
        - A score around 50 means a face is visible but the passport is blurry, obscured, or not present.
        - A score of 0 means the user's face is not visible or they are not attempting to show a document.

        Provide feedback on what the user did correctly or incorrectly.

        Return a JSON object with two fields:
        - "passportFeedback": "Your concise feedback for the user. For example, 'Great job showing your passport clearly next to your face.' or 'Your face was visible, but you were not holding a passport.'."
        - "passportScore": A score from 0 to 100 based on the verification criteria.

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
    if (!content) throw new Error("Passport analysis API returned empty response.");
    return JSON.parse(content);
}


export async function generateInterviewFeedback(
  input: GenerateInterviewFeedbackInput
): Promise<GenerateInterviewFeedbackOutput> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured.');
  }

  const { transcript, questionText, questionTags, snapshots } = FeedbackInputSchema.parse(input);

  try {
    const transcriptResult = await analyzeTranscript(transcript, questionText, questionTags);

    let passportAnalysisResult: { passportFeedback: string, passportScore: number } | null = null;
    let finalScore = transcriptResult.score;
    
    if (snapshots && snapshots.length > 0) {
        passportAnalysisResult = await analyzePassportVerification(snapshots);
        // Blend the scores. Give 50% weight to content and 50% to passport verification.
        finalScore = Math.round((transcriptResult.score * 0.5) + (passportAnalysisResult.passportScore * 0.5));
    }

    return FeedbackOutputSchema.parse({
      strengths: transcriptResult.strengths,
      weaknesses: transcriptResult.weaknesses,
      grammarFeedback: transcriptResult.grammarFeedback,
      overallPerformance: transcriptResult.overallPerformance,
      score: finalScore,
      visualFeedback: passportAnalysisResult?.passportFeedback,
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
