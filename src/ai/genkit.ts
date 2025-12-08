// Genkit initialization is temporarily disabled to resolve dependency issues.
// To re-enable, ensure @genkit-ai/core and necessary plugins are installed.

export const ai: any = {
    defineFlow: (config: any, implementation: any) => {
        return async (input: any) => {
            console.warn("Genkit flow is disabled.");
            // Return a default/mocked output based on the expected schema
            // to prevent downstream errors. For example, if a string is expected:
            if (config.outputSchema?.toString().includes("'string'")) {
                return "AI functionality is temporarily disabled.";
            }
             if (config.name === 'suggestQuestionFlow') {
                 return { suggestion: "AI suggestions are temporarily disabled." };
             }
            // Return a generic empty object if the schema is complex
            return {};
        };
    },
    generate: async (options: any) => {
        console.warn("Genkit generate is disabled.");
        return {
            text: () => "AI functionality is temporarily disabled.",
        }
    },
     definePrompt: (config: any) => {
        return async (input: any) => {
             console.warn("Genkit prompt is disabled.");
             return {
                text: () => "AI functionality is temporarily disabled.",
             }
        }
    }
};
