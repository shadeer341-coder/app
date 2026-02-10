
import Link from "next/link";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";
import { format } from 'date-fns';
import type { InterviewSessionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckCircle, Hourglass, Loader2, ServerCrash, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PaginationControls } from "@/components/ui/pagination";

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 10;

const statusConfig: Record<InterviewSessionStatus, { label: string, icon: React.ComponentType<any>, color: string }> = {
    pending: { label: 'Pending', icon: Hourglass, color: 'text-amber-500' },
    processing: { label: 'Processing', icon: Loader2, color: 'text-blue-500 animate-spin' },
    completed: { label: 'Completed', icon: CheckCircle, color: 'text-green-500' },
    failed: { label: 'Failed', icon: ServerCrash, color: 'text-red-500' }
};

const IndividualInterviewsPage = async () => {
    const user = await getCurrentUser();
    if (!user) {
        redirect('/');
    }

    const supabase = createSupabaseServerClient();
    const { data: sessions, error } = await supabase
        .from('interview_sessions')
        .select('id, created_at, overall_score, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching interview sessions:", error);
        return <p>Error loading interviews.</p>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">My Interviews</h1>
                <p className="text-muted-foreground">Review all your past interview sessions and feedback.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Interview History</CardTitle>
                    <CardDescription>Here are all of your recorded interview sessions.</CardDescription>
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
                                                {format(new Date(session.created_at), "PPP, p")}
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
                                        No interview sessions found.
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

const AgencyInterviewsPage = async ({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) => {
    const agencyUser = await getCurrentUser();
    if (!agencyUser || agencyUser.role !== 'agency' || !agencyUser.agencyId) {
        redirect('/dashboard');
    }
    
    const supabase = createSupabaseServiceRoleClient();
    const currentPage = Number(searchParams?.page || 1);

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
                                                <Link href={`/dashboard/students/${session.user_id}`}>
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

export default async function InterviewsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
    const user = await getCurrentUser();
    if (!user) {
        redirect('/');
    }

    if (user.role === 'agency') {
        return <AgencyInterviewsPage searchParams={searchParams} />;
    }
    
    return <IndividualInterviewsPage />;
}
