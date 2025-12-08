'use server';

/**
 * @fileOverview AI-driven question suggestion for admins.
 * This functionality is temporarily disabled.
 */

export type SuggestQuestionInput = {
  categoryName: string;
};
export type SuggestQuestionOutput = {
  suggestion: string;
};

export async function suggestQuestion(
  input: SuggestQuestionInput
): Promise<SuggestQuestionOutput> {
  console.log("AI question suggestion is temporarily disabled.");
  return { suggestion: "AI suggestion is temporarily disabled. Please enter a question manually." };
}
