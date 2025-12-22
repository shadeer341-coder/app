

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, Presentation, PenTool, CheckCircle, AlertTriangle, Sparkles, BrainCircuit, Target, Video, Star, Loader2, PartyPopper, ServerCrash } from 'lucide-react';
import Image from 'next/image';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { format } from 'date-fns';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type InterviewFeedbackPageProps = {
    params: {
        id: string; // This will now be the session_id
    }
};

export default async function InterviewFeedbackPage({ params }: InterviewFeedbackPageProps) {
    const user = await getCurrentUser();
    if (!user) {
        redirect('/');
    }

    const supabase = createSupabaseServerClient();
    
    // 1. Fetch the session data
    const { data: session, error: sessionError } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

    if (sessionError || !session) {
        console.error('Error fetching session:', sessionError);
        notFound();
    }

    // Handle non-completed statuses
    if (session.status === 'pending' || session.status === 'processing') {
        return (
            <Card className="flex flex-col items-center justify-center text-center p-8 md:p-12 min-h-[50vh]">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    </div>
                    <CardTitle className="text-2xl font-headline">Feedback is Being Prepared</CardTitle>
                    <CardDescription className="max-w-md mx-auto">
                        Your interview has been submitted and is currently in the queue for AI analysis. This process usually takes a few minutes. Please check back shortly.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">You can safely leave this page and return later.</p>
                </CardContent>
                 <CardFooter>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/interviews">
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            <span>Return to Interview List</span>
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }
    
    if (session.status === 'failed') {
         return (
            <Card className="flex flex-col items-center justify-center text-center p-8 md:p-12 min-h-[50vh] border-destructive">
                <CardHeader>
                    <div className="mx-auto bg-destructive/10 p-4 rounded-full mb-4">
                        <ServerCrash className="w-12 h-12 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl font-headline">Analysis Failed</CardTitle>
                    <CardDescription className="max-w-md mx-auto">
                        We're sorry, but an unexpected error occurred while analyzing your interview. Our team has been notified.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Please try another interview session. If the problem persists, contact support.</p>
                </CardContent>
                 <CardFooter>
                    <Button asChild variant="secondary">
                        <Link href="/dashboard/interviews">
                            <span>Return to Interview List</span>
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }


    // 2. Fetch all attempts linked to this session
    const { data: attempts, error: attemptsError } = await supabase
        .from('interview_attempts')
        .select(`
            *,
            questions (
                text,
                tags,
                question_categories (name)
            )
        `)
        .eq('session_id', params.id)
        .order('created_at', { ascending: true });

    if (attemptsError || !attempts) {
        console.error('Error fetching attempts for session:', attemptsError);
        return <p>Error loading attempt details.</p>;
    }

    const summary = session.summary as any;
    const visualFeedback = session.visual_feedback as any;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="font-headline text-3xl font-bold tracking-tight">Interview Session Feedback</h1>
                    <p className="text-muted-foreground">
                        Session from {format(new Date(session.created_at), "PPP, p")}
                    </p>
                </div>
                 <Button asChild>
                    <Link href="/dashboard/practice">
                        <PartyPopper className="mr-2"/>
                        Start New Interview
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/> Overall Performance Summary</CardTitle>
                            <CardDescription>
                                An AI-powered synthesis of your performance across all questions in this session.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           <div className="space-y-2">
                               <h4 className="font-semibold flex items-center gap-2"><BrainCircuit className="text-green-500" />Overall Strengths</h4>
                               <p className="text-muted-foreground">{summary?.overallStrengths || 'Not available.'}</p>
                           </div>
                           <Separator />
                           <div className="space-y-2">
                               <h4 className="font-semibold flex items-center gap-2"><Target className="text-yellow-500" />Key Areas for Improvement</h4>
                               <p className="text-muted-foreground">{summary?.overallWeaknesses || 'Not available.'}</p>
                           </div>
                           {visualFeedback?.visualFeedback && (
                                <>
                                <Separator />
                                <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2"><Video className="text-purple-500" />Visual Presentation</h4>
                                    <p className="text-muted-foreground">{visualFeedback.visualFeedback}</p>
                                </div>
                                </>
                           )}
                        </CardContent>
                         <CardFooter>
                            <Alert variant="default" className="bg-primary/10 border-primary/50">
                                <Lightbulb className="h-4 w-4 text-primary" />
                                <AlertTitle className="text-primary">Final Tips</AlertTitle>
                                <AlertDescription>{summary?.finalTips || 'Not available.'}</AlertDescription>
                            </Alert>
                         </CardFooter>
                    </Card>
                    
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold font-headline">Question Breakdown</h2>
                        <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                             {attempts && attempts.map((attempt, index) => {
                                const feedback = attempt.feedback as any;
                                const isPerfect = feedback?.weaknesses === '';
                                const firstAttemptWithSnapshots = attempts.find(a => a.snapshots && a.snapshots.length > 0);
                                return (
                                    <AccordionItem value={`item-${index}`} key={attempt.id}>
                                        <AccordionTrigger>
                                            <div className="flex justify-between items-center w-full pr-4">
                                                <span className="font-semibold text-left">Question {index + 1}: {attempt.questions?.question_categories?.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-muted-foreground">Score:</span>
                                                    <Badge>{attempt.score}%</Badge>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <Card className="border-none shadow-none">
                                                <CardContent className="space-y-4 pt-6">
                                                     {isPerfect ? (
                                                        <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                                                            <Star className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                            <AlertTitle className="text-green-800 dark:text-green-300">Answered Perfectly!</AlertTitle>
                                                            <AlertDescription className="text-green-700 dark:text-green-400">
                                                                {feedback?.strengths || "You addressed all the key points for this question."}
                                                            </AlertDescription>
                                                        </Alert>
                                                     ) : (
                                                        <>
                                                            <CardHeader className="p-0">
                                                                <CardTitle className="text-lg">{attempt.questions?.text}</CardTitle>
                                                                <CardDescription>
                                                                    <blockquote className="border-l-2 pl-4 italic bg-muted/50 p-3 rounded-md mt-2">
                                                                        Your Answer: {attempt.transcript || "No transcript available."}
                                                                    </blockquote>
                                                                </CardDescription>
                                                            </CardHeader>
                                                            <div className="space-y-2">
                                                                <h4 className="font-semibold flex items-center gap-2 text-sm"><CheckCircle className="text-green-500 h-4 w-4" />Strengths</h4>
                                                                <p className="text-muted-foreground text-sm">{feedback?.strengths || 'Not available.'}</p>
                                                            </div>
                                                            <Separator />
                                                            {feedback?.weaknesses && (
                                                                <div className="space-y-2">
                                                                    <h4 className="font-semibold flex items-center gap-2 text-sm"><AlertTriangle className="text-yellow-500 h-4 w-4" />Areas for Improvement</h4>
                                                                    <p className="text-muted-foreground text-sm">{feedback?.weaknesses}</p>
                                                                </div>
                                                            )}
                                                        </>
                                                     )}

                                                    {(feedback?.grammarFeedback && !isPerfect) && <Separator />}
                                                    
                                                    {!isPerfect && (
                                                        <div className="space-y-2">
                                                            <h4 className="font-semibold flex items-center gap-2 text-sm"><PenTool className="text-blue-500 h-4 w-4" />Clarity & Grammar</h4>
                                                            <p className="text-muted-foreground text-sm">{feedback?.grammarFeedback || 'Not available.'}</p>
                                                        </div>
                                                    )}
                                                </CardContent>
                                                 {user.role === 'admin' && attempt.id === firstAttemptWithSnapshots?.id && firstAttemptWithSnapshots.snapshots && firstAttemptWithSnapshots.snapshots.length > 0 && (
                                                    <CardFooter className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {firstAttemptWithSnapshots.snapshots.map((snapshot, i) => (
                                                            <div key={i} className="aspect-video relative rounded-md overflow-hidden border">
                                                                <Image 
                                                                    src={snapshot} 
                                                                    alt={`Snapshot ${i + 1}`}
                                                                    fill
                                                                    style={{ objectFit: 'cover' }}
                                                                    sizes="(max-width: 640px) 100vw, 50vw"
                                                                />
                                                                <div className="absolute bottom-0 right-0 bg-black/50 text-white text-xs px-2 py-1 rounded-tl-md">
                                                                    Snapshot {i + 1}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </CardFooter>
                                                )}
                                            </Card>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <Card className="sticky top-24">
                        <CardHeader className="items-center text-center">
                            <CardTitle>Overall Session Score</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4">
                            <div className="relative h-32 w-32">
                                <svg className="h-full w-full" viewBox="0 0 36 36">
                                    <path
                                    className="text-muted/50"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    />
                                    <path
                                    className="text-primary"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeDasharray={`${session.overall_score || 0}, 100`}
                                    strokeLinecap="round"
                                    transform="rotate(90 18 18)"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-3xl font-bold">{session.overall_score || 0}%</span>
                                </div>
                            </div>
                            <Progress value={session.overall_score || 0} className="h-2" />
                            <p className="text-sm text-muted-foreground text-center">
                                This is the average score from all {attempts?.length || 0} questions in this session.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
