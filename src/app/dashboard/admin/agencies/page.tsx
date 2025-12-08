import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ManageAgenciesPage() {
  return (
    <div className="space-y-6">
       <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Agency Management
          </h1>
          <p className="text-muted-foreground">
            Create, view, and manage all agencies in the system.
          </p>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>All Agencies</CardTitle>
          <CardDescription>
            This page will contain a table for managing all registered agencies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Agency management table and controls will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
