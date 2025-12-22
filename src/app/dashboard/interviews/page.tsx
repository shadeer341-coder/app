
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { CheckCircle, Hourglass, Loader2, ServerCrash } from "lucide-react";

export const dynamic = 'force-dynamic';

const statusConfig: Record<InterviewSessionStatus, { label: string, icon: React.ComponentType<any>, color: string }> = {
    pending: { label: 'Pending', icon: Hourglass, color: 'text-amber-500' },
    processing: { label: 'Processing', icon: Loader2, color: 'text-blue-500 animate-spin' },
    completed: { label: 'Completed', icon: CheckCircle, color: 'text-green-500' },
    failed: { label: 'Failed', icon: ServerCrash, color: 'text-red-500' }
};

export default async function InterviewsPage() {
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
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          My Interviews
        </h1>
        <p className="text-muted-foreground">
          Review all your past interview sessions and feedback.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Interview History</CardTitle>
          <CardDescription>
            Here are all of your recorded interview sessions.
          </CardDescription>
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
