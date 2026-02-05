

import { createSupabaseServerClient } from "@/lib/supabase/server";
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

    const supabase = createSupabaseServerClient();

    // 1. Fetch the student's profile
    const { data: student, error: studentError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.id)
        .single();
    
    if (studentError || !student) {
        console.error("Error fetching student profile:", studentError);
        notFound();
    }

    // Security Check: Ensure the student belongs to the current agency
    if (student.agency_id !== agencyUser.agencyId) {
        notFound();
    }

    // 2. Fetch the student's interview sessions
    const { data: sessions, error: sessionsError } = await supabase
        .from('interview_sessions')
        .select('id, created_at, overall_score, status')
        .eq('user_id', student.id)
        .order('created_at', { ascending: false });

    if (sessionsError) {
        console.error("Error fetching student's sessions:", sessionsError);
    }
    
    const studentAvatarUrl = student.avatar_url || `https://picsum.photos/seed/${student.id}/100/100`;

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-6">
                <Avatar className="h-20 w-20 border">
                    <AvatarImage src={studentAvatarUrl} alt={student.full_name || 'Student'} />
                    <AvatarFallback>{student.full_name?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <h1 className="font-headline text-3xl font-bold tracking-tight">{student.full_name}</h1>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4" /> {student.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <Repeat className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{student.interview_quota ?? 0}</span>
                        <span className="text-muted-foreground">attempts left</span>
                    </div>
                </div>
                <AddStudentQuotaDialog studentId={student.id} agencyUser={agencyUser as User} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Interview History</CardTitle>
                    <CardDescription>A list of all interview sessions completed by {student.full_name}.</CardDescription>
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
        </div>
    );
}
