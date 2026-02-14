
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Building } from "lucide-react";
import { AnalyticsChart } from "@/components/admin/analytics-chart";
import { subDays, format, eachDayOfInterval, startOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {

    const supabase = createSupabaseServiceRoleClient();

    // --- STATS CARDS (TOTALS) ---
    const { count: individualCount, error: individualError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'individual')
        .is('agency_id', null);

    const { count: invitedCount, error: invitedError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'individual')
        .not('agency_id', 'is', null);

    const { count: starterCount, error: starterError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'agency')
        .eq('agency_tier', 'Starter');

    const { count: standardCount, error: standardError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'agency')
        .eq('agency_tier', 'Standard');
        
    const { count: advancedCount, error: advancedError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'agency')
        .eq('agency_tier', 'Advanced');

    // --- TIME-SERIES DATA FOR CHART ---
    const endDate = new Date();
    const startDate = subDays(endDate, 29);

    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('created_at, role, agency_id, agency_tier')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

    if (profilesError) console.error("Error fetching profiles for chart:", profilesError);
    
    // Initialize a map with all days in the last 30 days
    const interval = eachDayOfInterval({ start: startDate, end: endDate });
    const dailyData = new Map<string, { Individual: number, Invited: number, Starter: number, Standard: number, Advanced: number }>();
    interval.forEach(day => {
        dailyData.set(format(day, 'yyyy-MM-dd'), { Individual: 0, Invited: 0, Starter: 0, Standard: 0, Advanced: 0 });
    });

    // Populate the map with data from fetched profiles
    profiles?.forEach(profile => {
        const day = format(startOfDay(new Date(profile.created_at)), 'yyyy-MM-dd');
        const dayCounts = dailyData.get(day);
        if (dayCounts) {
            if (profile.role === 'individual' && !profile.agency_id) {
                dayCounts.Individual++;
            } else if (profile.role === 'individual' && profile.agency_id) {
                dayCounts.Invited++;
            } else if (profile.role === 'agency') {
                if (profile.agency_tier === 'Starter') dayCounts.Starter++;
                else if (profile.agency_tier === 'Standard') dayCounts.Standard++;
                else if (profile.agency_tier === 'Advanced') dayCounts.Advanced++;
            }
        }
    });

    // Convert map to array for the chart
    const chartData = Array.from(dailyData.entries()).map(([date, counts]) => ({
        date: format(new Date(date), 'MMM d'), // Format for display
        ...counts,
    }));


    if (individualError) console.error("Error fetching individual users:", individualError);
    if (invitedError) console.error("Error fetching invited users:", invitedError);
    if (starterError) console.error("Error fetching starter agencies:", starterError);
    if (standardError) console.error("Error fetching standard agencies:", standardError);
    if (advancedError) console.error("Error fetching advanced agencies:", advancedError);

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
                <p className="text-xs text-muted-foreground">Total individual sign-ups.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agency-Invited Students</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{invitedCount || 0}</div>
                <p className="text-xs text-muted-foreground">Total students created by agencies.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agencies (Starter)</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{starterCount || 0}</div>
                <p className="text-xs text-muted-foreground">Total agencies on the Starter plan.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agencies (Standard)</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{standardCount || 0}</div>
                <p className="text-xs text-muted-foreground">Total agencies on the Standard plan.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agencies (Advanced)</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{advancedCount || 0}</div>
                <p className="text-xs text-muted-foreground">Total agencies on the Advanced plan.</p>
            </CardContent>
        </Card>
      </div>

      <AnalyticsChart data={chartData} />
    </div>
  );
}
