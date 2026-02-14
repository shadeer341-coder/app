
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Building } from "lucide-react";
import { AnalyticsChart } from "@/components/admin/analytics-chart";

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {

    const supabase = createSupabaseServiceRoleClient();

    // 1. Individual users (not associated with an agency)
    const { count: individualCount, error: individualError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'individual')
        .is('agency_id', null);

    // 2. Individuals invited by an agency
    const { count: invitedCount, error: invitedError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'individual')
        .not('agency_id', 'is', null);

    // 3. Agency - Starter
    const { count: starterCount, error: starterError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'agency')
        .eq('agency_tier', 'Starter');

    // 4. Agency - Standard
    const { count: standardCount, error: standardError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'agency')
        .eq('agency_tier', 'Standard');
        
    // 5. Agency - Advanced
    const { count: advancedCount, error: advancedError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'agency')
        .eq('agency_tier', 'Advanced');

    if (individualError) console.error("Error fetching individual users:", individualError);
    if (invitedError) console.error("Error fetching invited users:", invitedError);
    if (starterError) console.error("Error fetching starter agencies:", starterError);
    if (standardError) console.error("Error fetching standard agencies:", standardError);
    if (advancedError) console.error("Error fetching advanced agencies:", advancedError);

    const chartData = [
        { name: "Individual", count: individualCount || 0, fill: "hsl(var(--chart-1))" },
        { name: "Invited", count: invitedCount || 0, fill: "hsl(var(--chart-2))" },
        { name: "Starter", count: starterCount || 0, fill: "hsl(var(--chart-3))" },
        { name: "Standard", count: standardCount || 0, fill: "hsl(var(--chart-4))" },
        { name: "Advanced", count: advancedCount || 0, fill: "hsl(var(--chart-5))" }
    ];

  return (
    <div className="space-y-6">
       <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            System Analytics
          </h1>
          <p className="text-muted-foreground">
            A detailed overview of all user types in the system.
          </p>
        </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Individual Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{individualCount || 0}</div>
                <p className="text-xs text-muted-foreground">Standard individual sign-ups.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agency-Invited Students</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{invitedCount || 0}</div>
                <p className="text-xs text-muted-foreground">Students created by agencies.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agencies (Starter)</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{starterCount || 0}</div>
                <p className="text-xs text-muted-foreground">Agencies on the Starter plan.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agencies (Standard)</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{standardCount || 0}</div>
                <p className="text-xs text-muted-foreground">Agencies on the Standard plan.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agencies (Advanced)</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{advancedCount || 0}</div>
                <p className="text-xs text-muted-foreground">Agencies on the Advanced plan.</p>
            </CardContent>
        </Card>
      </div>

      <AnalyticsChart data={chartData} />
    </div>
  );
}
