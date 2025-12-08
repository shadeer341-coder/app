'use server';

/**
 * @fileOverview AI-driven question suggestion for admins.
 * This functionality is temporarily disabled to resolve dependency issues.
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
  console.log("suggestQuestion is temporarily disabled.");
  return {
    suggestion: "AI suggestion is temporarily disabled. Please enter a question manually."
  };
}
