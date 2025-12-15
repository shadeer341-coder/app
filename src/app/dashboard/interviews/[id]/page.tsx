
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, Presentation, PenTool, CheckCircle, AlertTriangle, Sparkles, BrainCircuit, Target } from 'lucide-react';
import Image from 'next/image';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { format } from 'date-fns';

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

    if (attemptsError) {
        console.error('Error fetching attempts for session:', attemptsError);
        // We can still render the page with just session info if attempts fail
    }

    const summary = session.summary as any;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">Interview Session Feedback</h1>
                <p className="text-muted-foreground">
                    Session from {format(new Date(session.created_at), "PPP, p")}
                </p>
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
                                                <CardHeader>
                                                    <CardTitle className="text-lg">{attempt.questions?.text}</CardTitle>
                                                    <CardDescription>
                                                        <blockquote className="border-l-2 pl-4 italic bg-muted/50 p-3 rounded-md mt-2">
                                                            Your Answer: {attempt.transcript || "No transcript available."}
                                                        </blockquote>
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="space-y-2">
                                                        <h4 className="font-semibold flex items-center gap-2 text-sm"><CheckCircle className="text-green-500 h-4 w-4" />Strengths</h4>
                                                        <p className="text-muted-foreground text-sm">{feedback?.strengths || 'Not available.'}</p>
                                                    </div>
                                                    <Separator />
                                                    <div className="space-y-2">
                                                        <h4 className="font-semibold flex items-center gap-2 text-sm"><AlertTriangle className="text-yellow-500 h-4 w-4" />Areas for Improvement</h4>
                                                        <p className="text-muted-foreground text-sm">{feedback?.weaknesses || 'Not available.'}</p>
                                                    </div>
                                                     <Separator />
                                                    <div className="space-y-2">
                                                        <h4 className="font-semibold flex items-center gap-2 text-sm"><PenTool className="text-blue-500 h-4 w-4" />Clarity & Grammar</h4>
                                                        <p className="text-muted-foreground text-sm">{feedback?.grammarFeedback || 'Not available.'}</p>
                                                    </div>
                                                </CardContent>
                                                <CardFooter className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                     {attempt.snapshots && attempt.snapshots.map((snapshot, i) => (
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
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.n-1p-0 -31.831"
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
