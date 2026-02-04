
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgencyUsagePage() {
  return (
    <div className="space-y-6">
       <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Quota Usage
          </h1>
          <p className="text-muted-foreground">
            Overview of your agency's interview quota usage.
          </p>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Usage Analytics</CardTitle>
          <CardDescription>
            This page will contain charts and stats about your members' usage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Usage charts coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
