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
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("GEMINI_API_KEY is not set.");
        return { suggestion: "API key is not configured. Please contact support." };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

        const prompt = `You are an expert in creating interview questions. Suggest one concise, high-quality interview question for the following category: "${input.categoryName}". The question should be suitable for a job interview. Do not add any preamble, just provide the question text.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        return { suggestion: text.trim() };

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return { suggestion: "There was an error generating a suggestion. Please try again." };
    }
}
