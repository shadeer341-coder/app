import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function InterviewsPage() {
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
            This page will contain a sortable and filterable table of all your interview attempts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Full interview history table will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
