

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Question, QuestionCategory } from '@/lib/types';
import { PracticeSession } from '@/components/interview/practice-session';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';

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

    if (!user) {
        redirect('/');
    }

    // Fetch all data in parallel
    const [
        { data: categoriesData, error: categoriesError },
        { data: questionsData, error: questionsError },
        { data: answeredAttempts, error: answeredError }
    ] = await Promise.all([
        supabase.from('question_categories').select('*').order('sort_order', { ascending: true }),
        supabase.from('questions').select('id, text, category_id, audio_url, tags'),
        supabase.from('interview_attempts').select('question_id').eq('user_id', user.id)
    ]);

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

    if (answeredError) {
        console.error("Could not fetch user's answered questions, proceeding without filtering.", answeredError.message);
    }
    
    const categories = (categoriesData as QuestionCategory[] | null) || [];
    const questions = (questionsData as any[] | null) || [];
    const answeredQuestionIds = new Set(answeredAttempts?.map(a => a.question_id) || []);

    // Generate the question queue
    let interviewQueue: (Pick<Question, 'id' | 'text' | 'category_id' | 'audio_url' | 'tags'> & { categoryName: string })[] = [];

    categories.forEach(category => {
        if (category.question_limit > 0) {
            const allCategoryQuestions = questions.filter(q => q.category_id === category.id);
            
            // Separate unseen and seen questions
            const unseenQuestions = allCategoryQuestions.filter(q => !answeredQuestionIds.has(q.id));
            const seenQuestions = allCategoryQuestions.filter(q => answeredQuestionIds.has(q.id));

            // Shuffle both lists to ensure randomness
            const shuffledUnseen = shuffle(unseenQuestions);
            const shuffledSeen = shuffle(seenQuestions);

            let selectedQuestions: typeof questions = [];

            // Prioritize unseen questions
            selectedQuestions = shuffledUnseen.slice(0, category.question_limit);

            // If we still need more questions, fill with seen ones
            if (selectedQuestions.length < category.question_limit) {
                const needed = category.question_limit - selectedQuestions.length;
                selectedQuestions = selectedQuestions.concat(shuffledSeen.slice(0, needed));
            }
            
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
                questions={interviewQueue.slice(0, 2)}
                user={user}
            />
        </div>
    );
}
