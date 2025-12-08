'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

export type SuggestQuestionInput = {
  categoryName: string;
};
export type SuggestQuestionOutput = {
  suggestion: string;
};

export async function suggestQuestion(
  input: SuggestQuestionInput
): Promise<SuggestQuestionOutput> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
        const errorMessage = "API key is not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY in your .env file.";
        console.error(errorMessage);
        return { suggestion: errorMessage };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

        const prompt = `You are an expert in creating interview questions. Suggest one concise, high-quality interview question for the following category: "${input.categoryName}". The question should be suitable for a job interview. Do not add any preamble, just provide the question text.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        return { suggestion: text.trim() };

    } catch (error: any) {
        const errorMessage = `Error calling Gemini API: ${error.message || 'An unknown error occurred'}`;
        console.error(errorMessage);
        return { suggestion: `There was an error generating a suggestion. Please check your API key and network connection. Details: ${error.message || 'Unknown'}` };
    }
}
