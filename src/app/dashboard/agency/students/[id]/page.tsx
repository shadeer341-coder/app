
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { CheckCircle, Hourglass, Loader2, ServerCrash, Repeat, Mail } from "lucide-react";
import type { InterviewSessionStatus, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AddStudentQuotaDialog } from "@/components/agency/add-student-quota-dialog";

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
        level: 'UG',
        ...(studentProfile || {})
    }

    // 5. Fetch sessions only if the user is not pending
    let sessions: any[] = [];
    if (!isPending) {
        const { data: sessionData, error: sessionsError } = await supabaseService
            .from('interview_sessions')
            .select('id, created_at, overall_score, status')
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
                    {isPending ? (
                         <Badge variant="secondary" className="mt-2">Pending Onboarding</Badge>
                    ) : (
                        <div className="flex items-center gap-2 mt-2">
                            <Repeat className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-foreground">{student.interview_quota ?? 0}</span>
                            <span className="text-muted-foreground">attempts left</span>
                        </div>
                    )}
                </div>
                {!isPending && <AddStudentQuotaDialog studentId={student.id} agencyUser={agencyUser as User} />}
            </div>
            
            {isPending ? (
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
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Interview History</CardTitle>
                        <CardDescription>A list of all interview sessions completed by {student.name}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Session Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Overall Score</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {sessions && sessions.length > 0 ? (
                                sessions.map((session: any) => {
                                    const statusInfo = statusConfig[session.status as InterviewSessionStatus] || statusConfig.pending;
                                    const Icon = statusInfo.icon;
                                    return (
                                        <TableRow key={session.id}>
                                            <TableCell className="font-medium">
                                            {session.created_at ? format(new Date(session.created_at), "PPP, p") : "No date"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Icon className={cn("h-4 w-4", statusInfo.color)} />
                                                    <span>{statusInfo.label}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                            {session.status === 'completed' ? (
                                                <Badge variant={session.overall_score > 75 ? 'default' : 'secondary'}>{session.overall_score || 'N/A'}%</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">--</span>
                                            )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/dashboard/interviews/${session.id}`}>View Details</Link>
                                            </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No interview sessions found for this student.
                                </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
