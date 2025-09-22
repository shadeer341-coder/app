import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgencyPage() {
  return (
    <div className="space-y-6">
       <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Agency Management
          </h1>
          <p className="text-muted-foreground">
            Manage your members and monitor their progress.
          </p>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Agency Dashboard</CardTitle>
          <CardDescription>
            This page will contain tools for inviting and managing agency members, as well as viewing their collective progress and results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Agency management features will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
