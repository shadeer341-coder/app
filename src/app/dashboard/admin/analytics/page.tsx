import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
       <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            System Analytics
          </h1>
          <p className="text-muted-foreground">
            An overview of system-wide usage and metrics.
          </p>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Usage Dashboard</CardTitle>
          <CardDescription>
            This page will feature charts and data visualisations for system analytics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>System analytics will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
