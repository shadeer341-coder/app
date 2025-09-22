import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProgressPage() {
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
          <CardTitle>Progress Tracking</CardTitle>
          <CardDescription>
            This page will feature charts and graphs visualizing your scores by category and over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Progress charts and visualizations will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
