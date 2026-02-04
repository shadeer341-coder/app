
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

export default function AgencyRechargePage() {
  return (
    <div className="space-y-6">
       <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Recharge Quota
          </h1>
          <p className="text-muted-foreground">
            Purchase more interview attempts for your agency members.
          </p>
        </div>
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap /> Purchase Attempts</CardTitle>
            <CardDescription>
                Select a package to add more interview attempts to your agency's quota.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Recharge options coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
