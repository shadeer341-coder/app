

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Question, QuestionCategory } from '@/lib/types';
import { PracticeSession } from '@/components/interview/practice-session';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

function shuffle(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


export default async function PracticePage() {
    const supabase = createSupabaseServerClient();
    const user = await getCurrentUser();

    const { data: categoriesData, error: categoriesError } = await supabase
        .from('question_categories')
        .select('*')
        .order('sort_order', { ascending: true });

    const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, text, category_id, audio_url');

    if (categoriesError || questionsError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                    <CardDescription>Could not load interview questions at this time.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>There was a problem fetching the necessary data from the database. Please try again later.</p>
                    <p className="text-sm text-muted-foreground mt-4">
                        {categoriesError?.message} {questionsError?.message}
                    </p>
                </CardContent>
            </Card>
        );
    }
    
    const categories = (categoriesData as QuestionCategory[] | null) || [];
    const questions = (questionsData as any[] | null) || [];

    // Generate the question queue
    const interviewQueue: (Pick<Question, 'id' | 'text' | 'category_id' | 'audio_url'> & { categoryName: string })[] = [];

    categories.forEach(category => {
        if (category.question_limit > 0) {
            const categoryQuestions = questions.filter(q => q.category_id === category.id);
            const shuffledQuestions = shuffle(categoryQuestions);
            const selectedQuestions = shuffledQuestions.slice(0, category.question_limit);
            
            selectedQuestions.forEach(q => {
                interviewQueue.push({ ...q, categoryName: category.name });
            });
        }
    });


    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    Practice Interview
                </h1>
                <p className="text-muted-foreground">
                    Answer the series of questions. You can review and re-record each answer before moving on.
                </p>
            </div>
            <PracticeSession 
                questions={interviewQueue}
                user={user}
            />
        </div>
    );
}
