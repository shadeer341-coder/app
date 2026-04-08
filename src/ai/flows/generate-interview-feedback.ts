
'use server';

import OpenAI from 'openai';
import { z } from 'zod';
import type { QuestionEvaluationSchema } from '@/lib/types';
import { generateQuestionEvaluationSchema, parseStoredEvaluationSchema } from '@/lib/question-evaluation-schema';

const FeedbackInputSchema = z.object({
  transcript: z.string().describe("The user's transcribed answer to the interview question."),
  questionText: z.string().describe("The text of the interview question that was asked."),
  questionTags: z.array(z.string()).optional().nullable().describe("A list of keywords or concepts expected in the answer."),
  questionEvaluationSchema: z.unknown().optional().nullable().describe("Optional stored internal evaluation schema for the question."),
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

function formatEvaluationSchema(schema: QuestionEvaluationSchema) {
    if (schema.questionType === 'direct') {
        return `
Question type: direct
Always required tags:
${schema.alwaysRequiredTags.map((tag) => `- ${tag}`).join('\n') || '- none'}
Branches: none
`;
    }

    return `
Question type: conditional
Always required tags:
${schema.alwaysRequiredTags.map((tag) => `- ${tag}`).join('\n') || '- none'}
Branches:
${schema.branches.map((branch) => `- ${branch.label}: applies when ${branch.appliesWhen}. Required tags: ${branch.requiredTags.length > 0 ? branch.requiredTags.join(', ') : 'none'}`).join('\n')}
`;
}

async function analyzeTranscript(
    transcript: string,
    questionText: string,
    evaluationSchema: QuestionEvaluationSchema,
    questionTags: string[] | undefined | null
) {
    const hasTags = questionTags && questionTags.length > 0;
    const prompt = `
        You are a strict interview evaluator. Your job is to evaluate an answer against the admin-approved tags organized by an internal question evaluation schema.
        The user was asked: "${questionText}"
        The user's answer: "${transcript}"
        ${hasTags ? `Admin tags for context only: ${questionTags!.join(', ')}.` : ''}

        Internal evaluation schema:
        ${formatEvaluationSchema(evaluationSchema)}

        Your task:
        1. Determine which branch applies based on the user's answer. If the question is direct, there is no branch.
        2. Evaluate the answer only against the always-required tags plus the required tags for the applicable branch.
        3. Never penalize the user for tags that belong only to a non-applicable branch.
        4. If the user correctly answers that a condition does not apply, do not ask them for details from the "yes" branch.
        5. You must not invent new required points beyond the admin tags in the schema.
        6. If the schema contains no tags at all, fall back to a general quality evaluation focused on relevance, clarity, and completeness.
        7. For the "strengths" field:
           - Mention what the user answered correctly in natural interview-feedback language.
           - Do not mention internal evaluation logic such as "branch", "condition applies", "condition does not apply", "schema", "applicable branch", or similar phrasing.
           - Keep this concise and user-facing.
        8. For the "weaknesses" field:
           - When tags exist, list only applicable missing tags or genuinely important clarity gaps related to those tags.
           - Do not list non-applicable branch tags.
           - If all applicable tags are covered, this field MUST be an empty string "".
           - Do not mention internal evaluation logic such as "branch", "condition applies", "condition does not apply", or "schema".
        9. For the "score" field:
           - Score only against the applicable requirements.
           - A concise but fully correct "no" answer for a conditional question can still deserve a high score.
           - If there are no tags, score based on overall answer quality rather than a checklist.
        10. For all user-facing text fields:
           - Write as concise coaching feedback for the candidate.
           - Avoid meta-analysis about how the evaluator decided what was required.
           - Prefer plain statements like "You answered clearly and directly." over explanatory evaluator language.
        
        Provide the feedback in a JSON object with the following fields:
        - "strengths": "Positive feedback based on the applicable schema requirements."
        - "weaknesses": "Only applicable missing items. If nothing applicable is missing, this MUST be an empty string."
        - "grammarFeedback": "Feedback on grammar, clarity, and use of filler words."
        - "overallPerformance": "A summary of the performance, focused on whether the applicable requirements were met."
        - "score": A score from 0 to 100 based on the applicable requirements only.

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

  const { transcript, questionText, questionTags, questionEvaluationSchema, snapshots } = FeedbackInputSchema.parse(input);

  try {
    const storedSchema = parseStoredEvaluationSchema(questionEvaluationSchema);
    const evaluationSchema = storedSchema || await generateQuestionEvaluationSchema({
      questionText,
      questionTags,
    });

    const transcriptResult = await analyzeTranscript(transcript, questionText, evaluationSchema, questionTags);

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
