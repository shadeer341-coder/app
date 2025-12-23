
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {

    const supabase = createSupabaseServerClient();

    const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'user');

    const { data: agencies, error: agenciesError } = await supabase
        .from('profiles')
        .select('agency_id', { count: 'exact', head: true })
        .not('agency_id', 'is', null);

    if (usersError) {
        console.error("Error fetching users for analytics:", usersError);
    }
    if (agenciesError) {
        console.error("Error fetching agencies for analytics:", agenciesError);
    }

    const standardUserCount = users?.length || 0;
    const agencyCount = agencies || 0;

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Standard Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{standardUserCount}</div>
                <p className="text-xs text-muted-foreground">Number of individual users registered.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Agencies</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{agencyCount}</div>
                <p className="text-xs text-muted-foreground">Number of unique agencies with members.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
