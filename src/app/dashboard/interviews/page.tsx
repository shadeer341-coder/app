
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

export const dynamic = 'force-dynamic';

export default async function InterviewsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }

  const supabase = createSupabaseServerClient();
  const { data: attempts, error } = await supabase
    .from('interview_attempts')
    .select(`
      id,
      created_at,
      score,
      questions (
        text,
        question_categories (
          name
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching interview attempts:", error);
    // You might want to show a proper error component here
    return <p>Error loading interviews.</p>;
  }


  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          My Interviews
        </h1>
        <p className="text-muted-foreground">
          Review all your past interview attempts and feedback.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Interview History</CardTitle>
          <CardDescription>
            Here are all of your recorded interview attempts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="max-w-[50%]">Question</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts && attempts.length > 0 ? (
                attempts.map((attempt: any) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-medium max-w-sm truncate">{attempt.questions?.text || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{attempt.questions?.question_categories?.name || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{attempt.score}%</TableCell>
                    <TableCell>
                      {format(new Date(attempt.created_at), "PPP")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/interviews/${attempt.id}`}>View Feedback</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No interview attempts found.
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
