import OpenAI from 'openai';
import { z } from 'zod';
import type { QuestionEvaluationSchema } from '@/lib/types';

const EvaluationBranchSchema = z.object({
  label: z.string().min(1).max(80),
  appliesWhen: z.string().min(1).max(240),
  requiredTags: z.array(z.string().min(1).max(120)).max(8),
});

const QuestionEvaluationSchemaSchema = z.object({
  version: z.literal(1),
  questionType: z.enum(['direct', 'conditional']),
  alwaysRequiredTags: z.array(z.string().min(1).max(120)).max(8),
  branches: z.array(EvaluationBranchSchema).max(4),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function normalizeTags(tags: string[]) {
  const seen = new Set<string>();

  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildHeuristicSchema(questionText: string, tags: string[] = []): QuestionEvaluationSchema {
  const normalizedTags = normalizeTags(tags);
  const conditionalPattern = /\b(if\s+yes|if\s+so|if\s+applicable|if\s+no|if\s+not|where\s+relevant|when\s+applicable)\b/i;
  const isConditional = conditionalPattern.test(questionText);

  if (!isConditional) {
    return {
      version: 1,
      questionType: 'direct',
      alwaysRequiredTags: normalizedTags,
      branches: [],
    };
  }

  return {
    version: 1,
    questionType: 'conditional',
    alwaysRequiredTags: normalizedTags.length > 0 ? [normalizedTags[0]] : [],
    branches: [
      {
        label: 'Condition applies',
        appliesWhen: 'the candidate clearly indicates yes or that the condition applies',
        requiredTags: normalizedTags.slice(1),
      },
      {
        label: 'Condition does not apply',
        appliesWhen: 'the candidate clearly indicates no or that the condition does not apply',
        requiredTags: [],
      },
    ],
  };
}

export function parseStoredEvaluationSchema(value: unknown): QuestionEvaluationSchema | null {
  const parsed = QuestionEvaluationSchemaSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function generateQuestionEvaluationSchema(params: {
  questionText: string;
  questionTags?: string[] | null;
}): Promise<QuestionEvaluationSchema> {
  const { questionText, questionTags } = params;
  const normalizedTags = normalizeTags(questionTags || []);
  const heuristicSchema = buildHeuristicSchema(questionText, normalizedTags);

  if (!process.env.OPENAI_API_KEY) {
    return heuristicSchema;
  }

  try {
    const prompt = `
You design internal evaluation schemas for interview questions.

Question:
"${questionText}"

Admin tags:
${normalizedTags.length > 0 ? normalizedTags.map((tag) => `- ${tag}`).join('\n') : '- none provided'}

Return JSON only with this shape:
{
  "version": 1,
  "questionType": "direct" | "conditional",
  "alwaysRequiredTags": ["..."],
  "branches": [
    {
      "label": "...",
      "appliesWhen": "...",
      "requiredTags": ["..."]
    }
  ]
}

Rules:
- Detect whether the question is genuinely conditional from the question text, not just from tags.
- Use only the exact admin tags provided above. Never invent, rewrite, expand, or paraphrase tags.
- Every tag may appear at most once across the entire schema.
- For direct questions, put all applicable admin tags in "alwaysRequiredTags" and return an empty "branches" array.
- For conditional questions, put only universally required admin tags in "alwaysRequiredTags".
- Put branch-specific admin tags into "branches".
- If the question has a negative branch like "no", that branch should usually have zero required follow-up tags.
- If there are no admin tags, return empty arrays instead of inventing requirements.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0].message?.content;
    if (!content) {
      return heuristicSchema;
    }

    const parsed = QuestionEvaluationSchemaSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      return heuristicSchema;
    }

    return {
      ...parsed.data,
      alwaysRequiredTags: normalizeTags(parsed.data.alwaysRequiredTags),
      branches: parsed.data.branches.map((branch) => ({
        ...branch,
        requiredTags: normalizeTags(branch.requiredTags),
      })),
    };
  } catch (error) {
    console.error('Failed to generate AI evaluation schema, using heuristic fallback:', error);
    return heuristicSchema;
  }
}
