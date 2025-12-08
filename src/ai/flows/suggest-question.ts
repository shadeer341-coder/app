'use server';

import OpenAI from 'openai';

export type SuggestQuestionInput = {
  categoryName: string;
};
export type SuggestQuestionOutput = {
  suggestion: string;
};

export async function suggestQuestion(
  input: SuggestQuestionInput
): Promise<SuggestQuestionOutput> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const errorMessage =
      'API key is not configured. Please set OPENAI_API_KEY in your .env file.';
    console.error(errorMessage);
    return { suggestion: errorMessage };
  }

  const openai = new OpenAI({ apiKey });

  try {
    const prompt = `You are an expert in creating interview questions. Suggest one concise, high-quality interview question for the following category: "${input.categoryName}". The question should be suitable for a job interview. Do not add any preamble, just provide the question text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
      n: 1,
      stop: null,
      temperature: 0.7,
    });

    const suggestion = response.choices[0].message?.content?.trim() || '';

    return { suggestion };
  } catch (error: any) {
    const errorMessage = `Error calling OpenAI API: ${
      error.message || 'An unknown error occurred'
    }`;
    console.error(errorMessage);
    return {
      suggestion: `There was an error generating a suggestion. Please check your API key and network connection. Details: ${
        error.message || 'Unknown'
      }`,
    };
  }
}
