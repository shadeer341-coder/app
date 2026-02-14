
import Link from "next/link";
import { ArrowRight, Bot, Building, HardHat, PlusCircle, Video, Repeat, Users, FileText, BarChart, Hourglass, Loader2, CheckCircle, ServerCrash } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { InterviewSessionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

const IndividualDashboard = async ({ user }: { user: any }) => {
    const supabase = createSupabaseServerClient();
    const { data: userSessions, error: sessionsError } = await supabase
      .from('interview_sessions')
      .select('id, overall_score, status, created_at, user_id, interview_attempts!inner(questions(text, question_categories(name)))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if(sessionsError){
      console.error("Error fetching user sessions: ", sessionsError);
    }

    const completedSessions = userSessions?.filter(s => s.status === 'completed') || [];
    const averageScore = completedSessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) / (completedSessions.length || 1);

    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userSessions?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Practice makes perfect</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {averageScore.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">Based on completed interviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attempts Remaining</CardTitle>
              <Repeat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {user.interview_quota ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Your available interview quota.</p>
            </CardContent>
          </Card>
        </div>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Interviews</CardTitle>
            <CardDescription>Review your most recent interview attempts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userSessions?.slice(0, 3).map(session => {
                  const firstCategory = session.interview_attempts[0]?.questions?.question_categories?.name;
                  return (
                    <TableRow key={session.id}>
                        <TableCell><Badge variant="outline">{firstCategory || 'General'}</Badge></TableCell>
                        <TableCell>{session.status === 'completed' ? `${session.overall_score}%` : <span className="text-muted-foreground capitalize">{session.status}</span>}</TableCell>
                        <TableCell>{new Date(session.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                        <Button asChild variant="ghost" size="sm">
                            <Link href={`/dashboard/interviews/${session.id}`}>View Details</Link>
                        </Button>
                        </TableCell>
                    </TableRow>
                  )
                })}
                 {(!userSessions || userSessions.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            You haven't completed any interviews yet.
                        </TableCell>
                    </TableRow>
                 )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </>
    );
};

const statusConfig: Record<InterviewSessionStatus, { label: string, icon: React.ComponentType<any>, color: string }> = {
    pending: { label: 'Pending', icon: Hourglass, color: 'text-amber-500' },
    processing: { label: 'Processing', icon: Loader2, color: 'text-blue-500 animate-spin' },
    completed: { label: 'Completed', icon: CheckCircle, color: 'text-green-500' },
    failed: { label: 'Failed', icon: ServerCrash, color: 'text-red-500' }
};

const AgencyDashboard = async ({ user }: { user: any }) => {
    const supabase = createSupabaseServiceRoleClient();

    const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('agency_id', user.agencyId!)
        .neq('id', user.id); // Exclude the agency owner's profile

    if (studentsError) {
        console.error("Error fetching agency students:", studentsError);
    }
    
    const studentIds = students?.map(s => s.id) || [];
    const memberCount = studentIds.length;

    let recentSessions: any[] = [];
    let allSessions: any[] = [];

    if (studentIds.length > 0) {
        const [
            { data: recentSessionsData, error: recentSessionsError },
            { data: allSessionsData, error: allSessionsError }
        ] = await Promise.all([
            supabase
                .from('interview_sessions')
                .select(`id, created_at, overall_score, status, user_id, profiles (full_name, avatar_url)`)
                .in('user_id', studentIds)
                .order('created_at', { ascending: false })
                .limit(5),
            supabase
                .from('interview_sessions')
                .select(`created_at, overall_score, status`)
                .in('user_id', studentIds)
        ]);

        if (recentSessionsError) {
            console.error("Error fetching recent member interviews:", recentSessionsError);
        } else {
            recentSessions = recentSessionsData || [];
        }

        if (allSessionsError) {
            console.error("Error fetching all member interviews for stats:", allSessionsError);
        } else {
            allSessions = allSessionsData || [];
        }
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const interviewsThisMonth = allSessions.filter(session => {
        const sessionDate = new Date(session.created_at);
        return sessionDate >= firstDayOfMonth;
    }).length;

    const completedSessions = allSessions.filter(s => s.status === 'completed' && s.overall_score != null);
    const totalScore = completedSessions.reduce((sum, s) => sum + (s.overall_score || 0), 0);
    const averageScore = completedSessions.length > 0 ? Math.round(totalScore / completedSessions.length) : 0;


    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{memberCount}</div>
                        <p className="text-xs text-muted-foreground">Number of students in your agency.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Interviews This Month</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{interviewsThisMonth}</div>
                        <p className="text-xs text-muted-foreground">Total sessions completed by members.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                        <BarChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{averageScore}%</div>
                        <p className="text-xs text-muted-foreground">Average score across all members.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Attempts Remaining</CardTitle>
                      <Repeat className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {user.interview_quota ?? 0}
                      </div>
                      <p className="text-xs text-muted-foreground">Your agency's interview quota.</p>
                    </CardContent>
                  </Card>
            </div>
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                        Latest interview sessions from your members.
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
                            {recentSessions.length > 0 ? recentSessions.map(session => {
                                const statusInfo = statusConfig[session.status as InterviewSessionStatus] || statusConfig.pending;
                                const Icon = statusInfo.icon;
                                const studentProfile = session.profiles;

                                return (
                                    <TableRow key={session.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={studentProfile?.avatar_url || `https://picsum.photos/seed/${session.user_id}/100/100`} alt={studentProfile?.full_name} />
                                                    <AvatarFallback>{studentProfile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <div className="font-medium">{studentProfile?.full_name || 'Unnamed Student'}</div>
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
                                        No recent activity from your members.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                 <CardFooter>
                    <Button asChild variant="outline" className="ml-auto">
                        <Link href="/dashboard/interviews">View All Interviews <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </CardFooter>
            </Card>
        </>
    );
};

const AdminDashboard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><HardHat /> Admin Control Panel</CardTitle>
        <CardDescription>Manage system-wide settings and content.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Button asChild size="lg" variant="outline"><Link href="/dashboard/questions">Manage Questions</Link></Button>
        <Button asChild size="lg" variant="outline"><Link href="/dashboard/admin">Manage Users</Link></Button>
        <Button asChild size="lg" variant="outline"><Link href="/dashboard/admin/agencies">Manage Agencies</Link></Button>
        <Button asChild size="lg" variant="outline"><Link href="/dashboard/admin/analytics">System Analytics</Link></Button>
      </CardContent>
    </Card>
);

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null; // Should be redirected by layout
  }

  let content;
  if (user.role === 'admin') {
    content = <AdminDashboard />;
  } else if (user.role === 'agency') {
    content = <AgencyDashboard user={user} />;
  } else {
    content = <IndividualDashboard user={user} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Welcome back, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your interview prep today.
          </p>
        </div>
        {user.role !== 'agency' && (
            <Button asChild size="lg" disabled={(user.interview_quota ?? 0) <= 0}>
            <Link href="/dashboard/practice">
                <PlusCircle className="mr-2 h-5 w-5" />
                Start New Interview
            </Link>
            </Button>
        )}
      </div>
      {content}
    </div>
  );
}
