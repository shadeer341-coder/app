

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle, Hourglass, Loader2, ServerCrash, Repeat, Mail, GraduationCap, Cake, User as UserIcon, Globe, Briefcase, University, Lightbulb } from "lucide-react";
import type { InterviewSessionStatus, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AddStudentQuotaDialog } from "@/components/agency/add-student-quota-dialog";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const dynamic = 'force-dynamic';

const statusConfig: Record<InterviewSessionStatus, { label: string, icon: React.ComponentType<any>, color: string }> = {
    pending: { label: 'Pending', icon: Hourglass, color: 'text-amber-500' },
    processing: { label: 'Processing', icon: Loader2, color: 'text-blue-500 animate-spin' },
    completed: { label: 'Completed', icon: CheckCircle, color: 'text-green-500' },
    failed: { label: 'Failed', icon: ServerCrash, color: 'text-red-500' }
};

export default async function StudentDetailPage({ params }: { params: { id: string }}) {
    const agencyUser = await getCurrentUser();
    if (!agencyUser || agencyUser.role !== 'agency' || !agencyUser.agencyId) {
        redirect('/dashboard');
    }

    const supabaseService = createSupabaseServiceRoleClient();
    
    // 1. Fetch student's auth user record
    const { data: authData, error: authError } = await supabaseService.auth.admin.getUserById(params.id);

    if (authError || !authData || !authData.user) {
        console.error("Auth user not found for ID:", params.id, authError);
        notFound();
    }
    const studentAuthUser = authData.user;

    // 2. Verify student belongs to this agency
    if (studentAuthUser.user_metadata?.agency_id !== agencyUser.agencyId) {
        console.warn(`Agency ${agencyUser.id} attempted to access student ${params.id} belonging to agency ${studentAuthUser.user_metadata?.agency_id}`);
        notFound();
    }
    
    // 3. Try to fetch the student's profile
    const { data: studentProfile, error: profileError } = await supabaseService
        .from('profiles')
        .select('*')
        .eq('id', params.id)
        .single();
    
    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found, which is OK for pending users.
        console.error("Error fetching student profile:", profileError);
        notFound();
    }

    const isPending = !studentProfile;

    // 4. Construct a 'student' object for rendering, combining auth and profile data
    const student: User = {
        id: studentAuthUser.id,
        email: studentAuthUser.email || 'No email',
        name: studentProfile?.full_name || studentAuthUser.user_metadata?.full_name || 'Pending User',
        avatarUrl: studentProfile?.avatar_url || `https://picsum.photos/seed/${studentAuthUser.id}/100/100`,
        interview_quota: studentProfile?.interview_quota,
        onboardingCompleted: !isPending,
        role: 'individual',
        ...(studentProfile || {})
    }

    // 5. Fetch sessions only if the user is not pending
    let sessions: any[] = [];
    if (!isPending) {
        const { data: sessionData, error: sessionsError } = await supabaseService
            .from('interview_sessions')
            .select('id, created_at, overall_score, status, summary')
            .eq('user_id', student.id)
            .order('created_at', { ascending: false });
        
        if (sessionsError) {
            console.error("Error fetching student's sessions:", sessionsError);
        } else {
            sessions = sessionData || [];
        }
    }


    return (
        <div className="space-y-6">
            {isPending ? (
                <>
                    <div className="flex items-start gap-6">
                        <Avatar className="h-20 w-20 border">
                            <AvatarImage src={student.avatarUrl!} alt={student.name || 'Student'} />
                            <AvatarFallback>{student.name?.charAt(0) || 'S'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h1 className="font-headline text-3xl font-bold tracking-tight">{student.name}</h1>
                            <p className="text-muted-foreground flex items-center gap-2 mt-1">
                                <Mail className="h-4 w-4" /> {student.email}
                            </p>
                            <Badge variant="secondary" className="mt-2">Pending Onboarding</Badge>
                        </div>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Awaiting Onboarding</CardTitle>
                            <CardDescription>This student has not completed their account setup yet.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center text-center p-8 h-40 rounded-lg bg-muted/50">
                                <p className="text-muted-foreground">Once the student logs in and completes the onboarding process, their interview history and details will appear here.</p>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                             <CardHeader className="items-center">
                                <Avatar className="h-24 w-24 border mb-4">
                                    <AvatarImage src={student.avatarUrl!} alt={student.name || 'Student'} />
                                    <AvatarFallback className="text-3xl">{student.name?.charAt(0) || 'S'}</AvatarFallback>
                                </Avatar>
                                <CardTitle className="text-2xl">{student.name}</CardTitle>
                                <CardDescription className="flex items-center gap-2"><Mail className="h-4 w-4" />{student.email}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2"><UserIcon className="h-4 w-4" />Gender</span>
                                    <span className="font-medium capitalize">{student.gender || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2"><Cake className="h-4 w-4" />Age</span>
                                    <span className="font-medium">{student.age || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2"><Globe className="h-4 w-4" />Nationality</span>
                                    <span className="font-medium">{student.nationality || 'N/A'}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2"><Briefcase className="h-4 w-4" />Program</span>
                                    <span className="font-medium text-right">{student.program || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2"><University className="h-4 w-4" />University</span>
                                    <span className="font-medium text-right">{student.university || 'N/A'}</span>
                                </div>
                                 <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2"><GraduationCap className="h-4 w-4" />Last Education</span>
                                    <span className="font-medium text-right">{student.lastEducation || 'N/A'}</span>
                                </div>
                            </CardContent>
                             <CardFooter className="flex-col gap-2">
                                <div className="flex items-center gap-2 justify-center rounded-full border bg-secondary px-4 py-2 w-full">
                                    <Repeat className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-semibold text-foreground">{student.interview_quota ?? 0}</span>
                                    <span className="text-muted-foreground">attempts left</span>
                                </div>
                                <AddStudentQuotaDialog studentId={student.id} agencyUser={agencyUser as User} />
                            </CardFooter>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Interview History</CardTitle>
                                <CardDescription>A list of all interview sessions completed by {student.name}.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {sessions && sessions.length > 0 ? (
                                     <Accordion type="single" collapsible className="w-full">
                                        {sessions.map((session: any) => {
                                            const statusInfo = statusConfig[session.status as InterviewSessionStatus] || statusConfig.pending;
                                            const Icon = statusInfo.icon;
                                            const summary = session.summary as any;
                                            
                                            return (
                                                <AccordionItem value={`item-${session.id}`} key={session.id}>
                                                    <AccordionTrigger>
                                                        <div className="flex justify-between items-center w-full pr-4">
                                                            <div className="flex flex-col items-start">
                                                                <span className="font-medium">{session.created_at ? format(new Date(session.created_at), "PPP") : "No date"}</span>
                                                                <span className="text-xs text-muted-foreground">{session.created_at ? format(new Date(session.created_at), "p") : ""}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                {session.status === 'completed' ? (
                                                                    <Badge variant={session.overall_score > 75 ? 'default' : 'secondary'}>Score: {session.overall_score || 'N/A'}%</Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className={cn("capitalize", statusInfo.color)}>
                                                                        <Icon className="h-3 w-3 mr-1.5" />
                                                                        {statusInfo.label}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                         {session.status === 'completed' && summary ? (
                                                            <div className="space-y-4 pt-2">
                                                                <div>
                                                                    <h4 className="font-semibold text-base mb-1">Overall Strengths</h4>
                                                                    <p className="text-sm text-muted-foreground">{summary.overallStrengths || 'Not available.'}</p>
                                                                </div>
                                                                <Separator />
                                                                <div>
                                                                    <h4 className="font-semibold text-base mb-1">Key Areas for Improvement</h4>
                                                                    <p className="text-sm text-muted-foreground">{summary.overallWeaknesses || 'Not available.'}</p>
                                                                </div>
                                                                 <Separator />
                                                                <Alert variant="default" className="bg-primary/5 border-primary/20">
                                                                    <Lightbulb className="h-4 w-4 text-primary" />
                                                                    <AlertTitle className="text-primary font-semibold">Final Tips</AlertTitle>
                                                                    <AlertDescription>{summary.finalTips || 'Not available.'}</AlertDescription>
                                                                </Alert>
                                                            </div>
                                                         ) : (
                                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                                General feedback is not yet available for this session.
                                                            </p>
                                                         )}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            )
                                        })}
                                     </Accordion>
                                ) : (
                                     <div className="flex items-center justify-center text-center p-8 h-40 rounded-lg bg-muted/50">
                                        <p className="text-sm text-muted-foreground">No interview sessions found for this student.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
