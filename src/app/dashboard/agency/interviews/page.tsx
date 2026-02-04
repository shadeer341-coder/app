
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgencyInterviewsPage() {
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
          <CardTitle>All Interviews</CardTitle>
          <CardDescription>
            This page will contain a table for viewing all member interviews.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Interview history table coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
