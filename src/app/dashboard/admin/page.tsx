import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <div className="space-y-6">
       <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Admin Panel
          </h1>
          <p className="text-muted-foreground">
            System-wide content and user management.
          </p>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
          <CardDescription>
            This page will contain interfaces for managing question categories, questions, users, and agencies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Admin features (CRUD for questions, etc.) will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
