
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressChart } from "@/components/progress/progress-chart";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }

  const supabase = createSupabaseServerClient();
  const { data: sessions, error } = await supabase
    .from('interview_sessions')
    .select('created_at, overall_score')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Error fetching sessions for progress chart:", error);
    // Render a graceful error state
    return (
        <Card>
            <CardHeader>
                <CardTitle>Error Loading Progress</CardTitle>
                <CardDescription>We couldn't fetch your session data right now. Please try again later.</CardDescription>
            </CardHeader>
        </Card>
    )
  }

  const chartData = sessions.map(session => ({
    date: format(new Date(session.created_at), "MMM d"),
    score: session.overall_score || 0,
  }));

  return (
    <div className="space-y-6">
       <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            My Progress
          </h1>
          <p className="text-muted-foreground">
            Visualize your improvement over time.
          </p>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Interview Score Over Time</CardTitle>
          <CardDescription>
            This chart tracks your average score for each completed interview session.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {chartData.length >= 2 ? (
            <ProgressChart data={chartData} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 h-80 rounded-lg bg-muted/50">
                <h3 className="text-xl font-semibold">Not Enough Data Yet</h3>
                <p className="text-muted-foreground mt-2 mb-4">Complete at least two interviews to see your progress chart.</p>
                <Button asChild>
                    <Link href="/dashboard/practice">
                        <PartyPopper className="mr-2" />
                        Start an Interview
                    </Link>
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
