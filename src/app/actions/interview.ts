
'use server';

import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { generateInterviewFeedback, type GenerateInterviewFeedbackInput } from "@/ai/flows/generate-interview-feedback";
import type { Question } from "@/lib/types";
import { revalidatePath } from "next/cache";

type AttemptDataItem = {
    questionId: number;
    audioBlob: Blob;
    snapshots: string[];
};

type FullInterviewDataItem = {
    question: Pick<Question, 'id' | 'text' | 'tags'>;
    attempt: AttemptDataItem;
};

async function transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'interview-answer.webm');

    // We need to get the full URL for the API route
    const host = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:9002';
    
    const response = await fetch(`${host}/api/transcribe`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Transcription failed: ${errorBody.error || response.statusText}`);
    }

    const result = await response.json();
    return result.transcript;
}


export async function submitInterview(fullInterviewData: FullInterviewDataItem[]) {
    const supabase = createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "User not authenticated." };
    }

    try {
        for (const item of fullInterviewData) {
            const { question, attempt } = item;
            
            // 1. Transcribe audio
            const transcript = await transcribeAudio(attempt.audioBlob);
            
            // 2. Generate AI Feedback
            const feedbackInput: GenerateInterviewFeedbackInput = {
                transcript: transcript,
                questionText: question.text,
                questionTags: question.tags || [],
                snapshots: attempt.snapshots,
            };

            const feedback = await generateInterviewFeedback(feedbackInput);

            // 3. Save to database
            const { error } = await supabase
                .from('interview_attempts')
                .insert({
                    user_id: user.id,
                    question_id: question.id,
                    transcript: transcript,
                    snapshots: attempt.snapshots,
                    feedback: feedback, // feedback is already a JSONB object
                    score: feedback.score,
                });

            if (error) {
                console.error("Error saving interview attempt to DB:", error);
                throw new Error(`Could not save attempt for question ID ${question.id}: ${error.message}`);
            }
        }
        
        revalidatePath('/dashboard/interviews');
        return { success: true, message: "Interview submitted successfully." };

    } catch (error: any) {
        console.error("An error occurred during interview submission:", error);
        return { success: false, message: error.message || "An unknown error occurred." };
    }
}
