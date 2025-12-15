
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, Presentation, PenTool, CheckCircle, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

type InterviewFeedbackPageProps = {
    params: {
        id: string;
    }
};

export default async function InterviewFeedbackPage({ params }: InterviewFeedbackPageProps) {
    const user = await getCurrentUser();
    if (!user) {
        redirect('/');
    }

    const supabase = createSupabaseServerClient();
    const { data: attempt, error } = await supabase
        .from('interview_attempts')
        .select(`
            *,
            questions (
                text,
                tags,
                question_categories (name)
            )
        `)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

    if (error || !attempt) {
        console.error('Error fetching attempt:', error);
        notFound();
    }
    
    // Type assertion for feedback, consider creating a proper type
    const feedback = attempt.feedback as any;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">Interview Feedback</h1>
                <p className="text-muted-foreground">Detailed analysis of your performance for a single question.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Question</CardTitle>
                    <div className="flex justify-between items-start pt-2">
                        <p className="text-lg font-semibold max-w-4xl">{attempt.questions?.text}</p>
                        <Badge variant="outline">{attempt.questions?.question_categories?.name}</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Your Answer (Transcript)</h3>
                        <blockquote className="border-l-2 pl-6 italic bg-secondary/50 p-4 rounded-md">
                            {attempt.transcript || "No transcript available."}
                        </blockquote>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Lightbulb className="text-primary"/> AI Feedback Analysis</CardTitle>
                            <CardDescription>
                                Here is the AI-generated feedback on your answer and presentation.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           <div className="space-y-2">
                               <h4 className="font-semibold flex items-center gap-2"><CheckCircle className="text-green-500" />Strengths</h4>
                               <p className="text-muted-foreground">{feedback?.strengths || 'Not available.'}</p>
                           </div>
                           <Separator />
                           <div className="space-y-2">
                               <h4 className="font-semibold flex items-center gap-2"><AlertTriangle className="text-yellow-500" />Areas for Improvement</h4>
                               <p className="text-muted-foreground">{feedback?.weaknesses || 'Not available.'}</p>
                           </div>
                           <Separator />
                           <div className="space-y-2">
                               <h4 className="font-semibold flex items-center gap-2"><PenTool className="text-blue-500" />Clarity & Grammar</h4>
                               <p className="text-muted-foreground">{feedback?.grammarFeedback || 'Not available.'}</p>
                           </div>
                        </CardContent>
                         <CardFooter>
                            <Alert>
                                <AlertTitle>Overall Performance</AlertTitle>
                                <AlertDescription>{feedback?.overallPerformance || 'Not available.'}</AlertDescription>
                            </Alert>
                         </CardFooter>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Presentation className="text-primary"/> Visual Presentation</CardTitle>
                            <CardDescription>Snapshots taken during your answer to analyze framing and lighting.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {attempt.snapshots && attempt.snapshots.map((snapshot, index) => (
                                <div key={index} className="aspect-video relative rounded-md overflow-hidden border">
                                    <Image 
                                        src={snapshot} 
                                        alt={`Snapshot ${index + 1}`}
                                        fill
                                        style={{ objectFit: 'cover' }}
                                        sizes="(max-width: 640px) 100vw, 50vw"
                                    />
                                    <div className="absolute bottom-0 right-0 bg-black/50 text-white text-xs px-2 py-1 rounded-tl-md">
                                        Snapshot {index + 1}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                </div>
                <div className="lg:col-span-1">
                    <Card className="sticky top-24">
                        <CardHeader className="items-center text-center">
                            <CardTitle>Overall Score</CardTitle>
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
                                    strokeDasharray={`${attempt.score || 0}, 100`}
                                    strokeLinecap="round"
                                    transform="rotate(90 18 18)"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-3xl font-bold">{attempt.score || 0}%</span>
                                </div>
                            </div>
                            <Progress value={attempt.score || 0} className="h-2" />
                            <p className="text-sm text-muted-foreground text-center">
                                This score is calculated based on answer relevance, clarity, and visual presentation.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
