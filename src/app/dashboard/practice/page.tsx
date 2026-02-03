

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Question, QuestionCategory } from '@/lib/types';
import { PracticeSession } from '@/components/interview/practice-session';
import { getCurrentUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle, FilePlus, Repeat } from 'lucide-react';

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

    if (user.role === 'user' && (user.interview_quota === null || user.interview_quota <= 0)) {
         return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="max-w-xl text-center">
                    <CardHeader>
                        <div className="mx-auto bg-destructive/10 p-4 rounded-full mb-4 w-fit">
                            <AlertCircle className="w-12 h-12 text-destructive" />
                        </div>
                        <CardTitle className="font-headline">Out of Attempts</CardTitle>
                        <CardDescription>You have used all of your available interview attempts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>To continue practicing, please upgrade your plan or wait for your quota to refresh.</p>
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                         <Button asChild>
                            <Link href="/dashboard">Return to Dashboard</Link>
                        </Button>
                        <Button variant="outline" disabled>
                            <Repeat className="mr-2"/>
                            Buy More Attempts (Coming Soon)
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    type QuestionQueueItem = Pick<Question, 'id' | 'text' | 'category_id' | 'audio_url' | 'tags' | 'read_time_seconds' | 'answer_time_seconds'> & { categoryName: string };

    // Fetch all data in parallel
    const [
        { data: categoriesData, error: categoriesError },
        { data: questionsData, error: questionsError },
        { data: answeredAttempts, error: answeredError }
    ] = await Promise.all([
        supabase.from('question_categories').select('*').order('sort_order', { ascending: true }),
        supabase.from('questions').select('id, text, category_id, audio_url, tags, read_time_seconds, answer_time_seconds'),
        supabase.from('interview_attempts').select('question_id').eq('user_id', user.id)
    ]);

    if (categoriesError || questionsError) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
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
            </div>
        );
    }

    if (answeredError) {
        console.error("Could not fetch user's answered questions, proceeding without filtering.", answeredError.message);
    }
    
    const categories = (categoriesData as QuestionCategory[] | null) || [];
    const questions = (questionsData as any[] | null) || [];
    const answeredQuestionIds = new Set(answeredAttempts?.map(a => a.question_id) || []);

    // Generate the question queue
    let interviewQueue: QuestionQueueItem[] = [];

    const preInterviewCheckCategory = categories.find(c => c.name === 'Pre-Interview Checks');
    const defaultCategory = categories.find(c => c.name.toLowerCase() === 'default');
    const otherCategories = categories.filter(c => c.name.toLowerCase() !== 'default' && c.name !== 'Pre-Interview Checks');

    // 1. Add "Pre-Interview Checks" questions first. They are mandatory.
    if (preInterviewCheckCategory) {
        const checkQuestions = questions.filter(q => q.category_id === preInterviewCheckCategory.id);
        checkQuestions.forEach(q => {
            interviewQueue.push({ ...q, categoryName: preInterviewCheckCategory.name });
        });
    }

    // 2. Add "Default" questions next, if they exist
    if (defaultCategory) {
        const defaultQuestions = questions.filter(q => q.category_id === defaultCategory.id);
        const shuffledDefault = shuffle(defaultQuestions);
        shuffledDefault.slice(0, defaultCategory.question_limit).forEach(q => {
            interviewQueue.push({ ...q, categoryName: defaultCategory.name });
        });
    }

    // 3. Then add questions from other categories
    otherCategories.forEach(category => {
        if (category.question_limit > 0) {
            const allCategoryQuestions = questions.filter(q => q.category_id === category.id);
            
            const unseenQuestions = allCategoryQuestions.filter(q => !answeredQuestionIds.has(q.id));
            const seenQuestions = allCategoryQuestions.filter(q => answeredQuestionIds.has(q.id));

            const shuffledUnseen = shuffle(unseenQuestions);
            const shuffledSeen = shuffle(seenQuestions);

            let selectedQuestions: typeof questions = [];

            selectedQuestions = shuffledUnseen.slice(0, category.question_limit);

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
        <PracticeSession 
            questions={interviewQueue.slice(0, 4)}
            user={user}
        />
    );
}
