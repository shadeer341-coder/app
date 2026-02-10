
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination";

import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import type { InterviewSessionStatus } from "@/lib/types";
import { CheckCircle, Hourglass, Loader2, ServerCrash, ArrowRight } from "lucide-react";

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 10;

const statusConfig: Record<InterviewSessionStatus, { label: string, icon: React.ComponentType<any>, color: string }> = {
    pending: { label: 'Pending', icon: Hourglass, color: 'text-amber-500' },
    processing: { label: 'Processing', icon: Loader2, color: 'text-blue-500 animate-spin' },
    completed: { label: 'Completed', icon: CheckCircle, color: 'text-green-500' },
    failed: { label: 'Failed', icon: ServerCrash, color: 'text-red-500' }
};

export default async function AgencyInterviewsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
    const agencyUser = await getCurrentUser();
    if (!agencyUser || agencyUser.role !== 'agency' || !agencyUser.agencyId) {
        redirect('/dashboard');
    }
    
    const supabase = createSupabaseServiceRoleClient();
    const currentPage = Number(searchParams?.page || 1);

    // 1. Get all student IDs for the agency
    const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('agency_id', agencyUser.agencyId);
    
    if (studentsError) {
        console.error("Error fetching agency students:", studentsError);
        return <p>Error loading data. Please try again later.</p>;
    }

    const studentIds = students.map(s => s.id);
    let sessions: any[] = [];
    let totalCount = 0;

    if (studentIds.length > 0) {
        // 2. Fetch paginated interview sessions for those students
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        const { data: sessionData, error: sessionsError, count } = await supabase
            .from('interview_sessions')
            .select(`
                id,
                created_at,
                overall_score,
                status,
                user_id,
                profiles (
                    full_name,
                    avatar_url
                )
            `, { count: 'exact' })
            .in('user_id', studentIds)
            .order('created_at', { ascending: false })
            .range(from, to);
        
        if (sessionsError) {
            console.error("Error fetching member interviews:", sessionsError);
        } else {
            sessions = sessionData || [];
            totalCount = count || 0;
        }
    }
    
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    Member Interviews
                </h1>
                <p className="text-muted-foreground">
                    Review interview sessions from all members of your agency.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>All Interview Sessions</CardTitle>
                    <CardDescription>
                        A log of all interviews taken by your agency's students.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessions.length > 0 ? sessions.map(session => {
                                const statusInfo = statusConfig[session.status as InterviewSessionStatus] || statusConfig.pending;
                                const Icon = statusInfo.icon;

                                return (
                                    <TableRow key={session.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={session.profiles?.avatar_url || `https://picsum.photos/seed/${session.user_id}/100/100`} alt={session.profiles?.full_name} />
                                                    <AvatarFallback>{session.profiles?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <div className="font-medium">{session.profiles?.full_name || 'Unnamed Student'}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(session.created_at), "PPP")}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Icon className={cn("h-4 w-4", statusInfo.color)} />
                                                <span>{statusInfo.label}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {session.status === 'completed' ? (
                                                <Badge variant={session.overall_score > 75 ? 'default' : 'secondary'}>
                                                    {session.overall_score}%
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">--</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/dashboard/agency/students/${session.user_id}`}>
                                                    View Student <ArrowRight className="ml-2 h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No interview sessions found for your members.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                {totalPages > 1 && (
                    <CardFooter>
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                        />
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
