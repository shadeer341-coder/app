
import Link from "next/link";
import { ArrowRight, Bot, Building, HardHat, PlusCircle, Video } from "lucide-react";
import { redirect } from 'next/navigation';

import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { interviewAttempts, users as allUsers } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  const renderUserDashboard = () => {
    const userAttempts = interviewAttempts.filter(a => a.userId === user.id).slice(0, 3);
    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{interviewAttempts.filter(a => a.userId === user.id).length}</div>
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
                {
                  (interviewAttempts.filter(a => a.userId === user.id).reduce((sum, a) => sum + a.score, 0) / interviewAttempts.filter(a => a.userId === user.id).length || 0).toFixed(1)
                }%
              </div>
              <p className="text-xs text-muted-foreground">Based on your attempts</p>
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
                  <TableHead>Question</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userAttempts.map(attempt => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-medium max-w-xs truncate">{attempt.question.text}</TableCell>
                    <TableCell><Badge variant="outline">{attempt.question.category.name}</Badge></TableCell>
                    <TableCell>{attempt.score}%</TableCell>
                    <TableCell>{new Date(attempt.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/interviews/${attempt.id}`}>View Feedback</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </>
    );
  };

  const renderAgencyAdminDashboard = () => {
    if (!user.agencyId) return <p>No agency associated with this account.</p>;
    const agencyMembers = allUsers.filter(u => u.agencyId === user.agencyId);
    const memberAttempts = interviewAttempts.filter(a => agencyMembers.some(m => m.id === a.userId)).slice(0, 5);
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Agency Members</CardTitle>
            <CardDescription>Overview of your agency's members.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {agencyMembers.map(member => (
              <div key={member.id} className="flex items-center gap-2 rounded-full border p-1 pr-3">
                  <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatarUrl} alt={member.name} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{member.name}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Member Activity</CardTitle>
            <CardDescription>Latest interview attempts from your members.</CardDescription>
          </CardHeader>
          <CardContent>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberAttempts.map(attempt => {
                    const attemptUser = allUsers.find(u => u.id === attempt.userId);
                    return (
                        <TableRow key={attempt.id}>
                            <TableCell className="font-medium">{attemptUser?.name}</TableCell>
                            <TableCell className="max-w-xs truncate">{attempt.question.text}</TableCell>
                            <TableCell>{attempt.score}%</TableCell>
                            <TableCell>{new Date(attempt.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                    )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAdminDashboard = () => (
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

  const roleDashboards = {
    user: renderUserDashboard(),
    agency_admin: renderAgencyAdminDashboard(),
    admin: renderAdminDashboard(),
  };

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
        {user.role !== 'admin' && (
            <Button asChild size="lg">
            <Link href="/dashboard/practice">
                <PlusCircle className="mr-2 h-5 w-5" />
                Start New Interview
            </Link>
            </Button>
        )}
      </div>

      {roleDashboards[user.role]}
    </div>
  );
}
