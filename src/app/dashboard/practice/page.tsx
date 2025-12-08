
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Question, QuestionCategory } from '@/lib/types';
import { PracticeSession } from '@/components/interview/practice-session';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function PracticePage() {
    const supabase = createSupabaseServerClient();
    const user = await getCurrentUser();

    const { data: categoriesData, error: categoriesError } = await supabase
        .from('question_categories')
        .select('*')
        .order('name', { ascending: true });

    const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, text, category_id');

    if (categoriesError || questionsError) {
        return <p>Error loading questions. Please try again later.</p>
    }
    
    const categories = (categoriesData as QuestionCategory[] | null) || [];
    const questions = (questionsData as any[] | null) || [];


    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    Practice Interview
                </h1>
                <p className="text-muted-foreground">
                    Select a category, prepare your answer, and record your response.
                </p>
            </div>
            <PracticeSession 
                categories={categories}
                questions={questions}
                user={user}
            />
        </div>
    );
}
