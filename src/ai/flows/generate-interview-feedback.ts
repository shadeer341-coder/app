
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
  appliedBranch: z.string().optional().describe("The schema branch that was evaluated, when applicable."),
  coveredTags: z.array(z.string()).optional().describe("Applicable required tags the answer covered."),
  missingTags: z.array(z.string()).optional().describe("Applicable required tags the answer missed."),
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

const CoverageAssessmentSchema = z.object({
    tag: z.string(),
    covered: z.boolean(),
    evidence: z.string().optional(),
});

const CoverageResultSchema = z.object({
    appliedBranch: z.string().nullable(),
    assessments: z.array(CoverageAssessmentSchema),
});

type TranscriptCoverage = {
    appliedBranch: string | null;
    applicableRequiredTags: string[];
    coveredTags: string[];
    missingTags: string[];
};

type SchemaDrivenFeedback = {
    strengths: string;
    grammarFeedback: string;
    overallPerformance: string;
    score: number;
};

function getAllSchemaTags(schema: QuestionEvaluationSchema) {
    const seen = new Set<string>();
    const orderedTags = [...schema.alwaysRequiredTags, ...schema.branches.flatMap((branch) => branch.requiredTags)];

    return orderedTags.filter((tag) => {
        const key = tag.trim().toLowerCase();
        if (!key || seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

function getApplicableRequiredTags(schema: QuestionEvaluationSchema, appliedBranchLabel: string | null) {
    const branch = schema.questionType === 'conditional'
        ? schema.branches.find((candidate) => candidate.label === appliedBranchLabel) || null
        : null;

    return [...schema.alwaysRequiredTags, ...(branch?.requiredTags || [])];
}

function buildWeaknessesFromMissingTags(missingTags: string[]) {
    if (missingTags.length === 0) {
        return '';
    }

    const prefix = missingTags.length === 1 ? 'You should also mention:' : 'You should also mention these points:';
    return `${prefix} ${missingTags.join('; ')}`;
}

async function analyzeTagCoverage(
    transcript: string,
    questionText: string,
    evaluationSchema: QuestionEvaluationSchema,
    questionTags: string[] | undefined | null
) : Promise<TranscriptCoverage> {
    const schemaTags = getAllSchemaTags(evaluationSchema);

    if (schemaTags.length === 0) {
        return {
            appliedBranch: null,
            applicableRequiredTags: [],
            coveredTags: [],
            missingTags: [],
        };
    }

    const hasTags = questionTags && questionTags.length > 0;
    const prompt = `
        You are a strict interview evaluator. Your job is to determine which required schema tags are covered by the answer.
        The user was asked: "${questionText}"
        The user's answer: "${transcript}"
        ${hasTags ? `Admin tags for context only: ${questionTags!.join(', ')}.` : ''}

        Internal evaluation schema:
        ${formatEvaluationSchema(evaluationSchema)}

        Allowed branch labels:
        ${evaluationSchema.questionType === 'conditional' ? evaluationSchema.branches.map((branch) => `- ${branch.label}`).join('\n') : '- none'}

        All schema tags you may assess:
        ${schemaTags.map((tag) => `- ${tag}`).join('\n')}

        Return JSON only in this shape:
        {
          "appliedBranch": "exact branch label or null",
          "assessments": [
            {
              "tag": "exact schema tag",
              "covered": true,
              "evidence": "brief quote or paraphrase from the answer"
            }
          ]
        }

        Rules:
        1. Use only exact branch labels from the schema. For direct questions, "appliedBranch" must be null.
        2. Include exactly one assessment for every schema tag listed above, using the exact tag text.
        3. Assess semantic meaning, not exact wording. Paraphrases and close equivalents count as covered.
        4. For conditional questions, first determine the applied branch from the answer. A clear "no" answer must use the negative branch, and a clear "yes" answer must use the positive branch.
        5. Mark a tag as covered only if the answer actually communicates that point. Do not infer missing details as covered.
        6. Do not invent tags, branches, or requirements.
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0].message?.content;
    if (!content) throw new Error("Transcript coverage API returned empty response.");

    const parsed = CoverageResultSchema.parse(JSON.parse(content));
    const applicableRequiredTags = getApplicableRequiredTags(evaluationSchema, parsed.appliedBranch);
    const coverageByTag = new Map(parsed.assessments.map((assessment) => [assessment.tag, assessment.covered]));

    const coveredTags = applicableRequiredTags.filter((tag) => coverageByTag.get(tag) === true);
    const missingTags = applicableRequiredTags.filter((tag) => coverageByTag.get(tag) !== true);

    return {
        appliedBranch: parsed.appliedBranch,
        applicableRequiredTags,
        coveredTags,
        missingTags,
    };
}

async function generateSchemaDrivenFeedback(
    transcript: string,
    questionText: string,
    coverage: TranscriptCoverage
) : Promise<SchemaDrivenFeedback> {
    const prompt = `
        You are a strict interview evaluator writing concise candidate-facing feedback.
        The question was: "${questionText}"
        The user's answer was: "${transcript}"

        Applied branch: ${coverage.appliedBranch || 'none'}
        Applicable required tags:
        ${coverage.applicableRequiredTags.map((tag) => `- ${tag}`).join('\n') || '- none'}

        Covered required tags:
        ${coverage.coveredTags.map((tag) => `- ${tag}`).join('\n') || '- none'}

        Missing required tags:
        ${coverage.missingTags.map((tag) => `- ${tag}`).join('\n') || '- none'}

        Return JSON only with:
        {
          "strengths": "...",
          "grammarFeedback": "...",
          "overallPerformance": "...",
          "score": 0
        }

        Rules:
        1. Base the score on the applicable required tags only.
        2. A concise but correct "no" answer can still score well if it covers all applicable requirements.
        3. Do not mention internal evaluator concepts like schema, branch, or required tags.
        4. Do not mention missing points in "strengths".
        5. Keep all text concise and user-facing.
        6. If some required tags are missing, reduce the score materially.
        7. If all applicable required tags are covered, reward clarity and directness.
        8. "grammarFeedback" must focus only on grammar, clarity, and filler words.
        9. "overallPerformance" must summarize whether the answer met the applicable expectations.
      `;

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0].message?.content;
    if (!content) throw new Error("Schema-driven feedback API returned empty response.");

    return z.object({
        strengths: z.string(),
        grammarFeedback: z.string(),
        overallPerformance: z.string(),
        score: z.number().int().min(0).max(100),
    }).parse(JSON.parse(content));
}

async function analyzeTranscriptWithoutSchema(
    transcript: string,
    questionText: string
) {
    const prompt = `
        You are a strict interview evaluator.
        The user was asked: "${questionText}"
        The user's answer: "${transcript}"

        Evaluate the answer for relevance, clarity, completeness, and grammar.

        Provide the feedback in a JSON object with the following fields:
        - "strengths": "Positive feedback based on the answer quality."
        - "weaknesses": "Missing points or clarity gaps. Use an empty string if there are no material issues."
        - "grammarFeedback": "Feedback on grammar, clarity, and use of filler words."
        - "overallPerformance": "A summary of the performance."
        - "score": A score from 0 to 100.

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

    const schemaTags = getAllSchemaTags(evaluationSchema);
    const hasSchemaRequirements = schemaTags.length > 0;

    let transcriptResult: {
        strengths: string;
        weaknesses: string;
        grammarFeedback: string;
        overallPerformance: string;
        score: number;
        appliedBranch?: string;
        coveredTags?: string[];
        missingTags?: string[];
    };

    if (hasSchemaRequirements) {
        const coverage = await analyzeTagCoverage(transcript, questionText, evaluationSchema, questionTags);
        const schemaFeedback = await generateSchemaDrivenFeedback(transcript, questionText, coverage);

        transcriptResult = {
            ...schemaFeedback,
            weaknesses: buildWeaknessesFromMissingTags(coverage.missingTags),
            appliedBranch: coverage.appliedBranch || undefined,
            coveredTags: coverage.coveredTags,
            missingTags: coverage.missingTags,
        };
    } else {
        transcriptResult = await analyzeTranscriptWithoutSchema(transcript, questionText);
    }

    let passportAnalysisResult: { passportFeedback: string, passportScore: number } | null = null;
    let finalScore = transcriptResult.score;
    
    if (snapshots && snapshots.length > 0) {
        const passportResult = await analyzePassportVerification(snapshots);
        passportAnalysisResult = passportResult;
        // Blend the scores. Give 50% weight to content and 50% to passport verification.
        finalScore = Math.round((transcriptResult.score * 0.5) + (passportResult.passportScore * 0.5));
    }

    return FeedbackOutputSchema.parse({
      strengths: transcriptResult.strengths,
      weaknesses: transcriptResult.weaknesses,
      grammarFeedback: transcriptResult.grammarFeedback,
      overallPerformance: transcriptResult.overallPerformance,
      score: finalScore,
      visualFeedback: passportAnalysisResult?.passportFeedback,
      appliedBranch: transcriptResult.appliedBranch,
      coveredTags: transcriptResult.coveredTags,
      missingTags: transcriptResult.missingTags,
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
