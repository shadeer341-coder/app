
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgencyStudentsPage() {
  return (
    <div className="space-y-6">
       <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Manage Students
          </h1>
          <p className="text-muted-foreground">
            Add, view, and manage all students in your agency.
          </p>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
          <CardDescription>
            This page will contain a table for managing your students.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Student management table coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
