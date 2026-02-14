
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Building } from "lucide-react";
import { AnalyticsChart } from "@/components/admin/analytics-chart";
import { AnalyticsControls } from "@/components/admin/analytics-controls";
import { subDays, startOfDay, format, eachDayOfInterval, subMonths, subYears, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

const getDateRange = (range?: string, from?: string, to?: string) => {
    const toDate = to ? parseISO(to) : new Date();
    let fromDate;

    if (range === 'custom' && from) {
        fromDate = parseISO(from);
    } else {
        switch (range) {
            case '3m':
                fromDate = subMonths(new Date(), 3);
                break;
            case '6m':
                fromDate = subMonths(new Date(), 6);
                break;
            case '12m':
                fromDate = subYears(new Date(), 1);
                break;
            case '30d':
            default:
                fromDate = subDays(new Date(), 29);
                break;
        }
    }
    return { startDate: startOfDay(fromDate), endDate: startOfDay(toDate) };
}


export default async function AnalyticsPage({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {

    const supabase = createSupabaseServiceRoleClient();

    const { startDate, endDate } = getDateRange(searchParams.range, searchParams.from, searchParams.to);

    // --- STATS CARDS (TOTALS) ---
    const { count: individualCount, error: individualError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('role', 'in', '("agency", "admin", "super_admin")')
        .is('agency_id', null);

    const { count: invitedCount, error: invitedError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('role', 'in', '("agency", "admin", "super_admin")')
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
    const interval = eachDayOfInterval({ start: startDate, end: endDate });
    const dailyData = new Map<string, { Individual: number, Invited: number, Starter: number, Standard: number, Advanced: number }>();
    interval.forEach(day => {
        dailyData.set(format(day, 'yyyy-MM-dd'), { Individual: 0, Invited: 0, Starter: 0, Standard: 0, Advanced: 0 });
    });

    const { data: authData, error: authUsersError } = await supabase.auth.admin.listUsers({ perPage: 1000 }); 

    if (authUsersError) {
        console.error("Error fetching auth users:", authUsersError.message);
    }

    const recentAuthUsers = authData?.users.filter(user => {
        const createdAt = new Date(user.created_at);
        return createdAt >= startDate && createdAt <= endDate;
    }) || [];
    
    if (recentAuthUsers.length > 0) {
        const userIds = recentAuthUsers.map(u => u.id);

        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, role, agency_id, agency_tier')
            .in('id', userIds);
        
        if (profilesError) {
            console.error("Error fetching profiles for chart:", profilesError.message);
        } else {
             const profilesMap = new Map(profiles.map(p => [p.id, p]));

             for (const authUser of recentAuthUsers) {
                const day = format(startOfDay(new Date(authUser.created_at)), 'yyyy-MM-dd');
                const dayCounts = dailyData.get(day);
                if (!dayCounts) continue;

                const profile = profilesMap.get(authUser.id);
                const meta = authUser.user_metadata || {};
                
                let userType: 'Individual' | 'Invited' | 'Starter' | 'Standard' | 'Advanced' | null = null;
                
                if (profile) { // User has a profile (onboarding completed)
                    if (profile.role === 'agency') {
                        if (profile.agency_tier === 'Standard') userType = 'Standard';
                        else if (profile.agency_tier === 'Advanced') userType = 'Advanced';
                        else userType = 'Starter';
                    } else if (profile.role !== 'admin' && profile.role !== 'super_admin') {
                        if (profile.agency_id) {
                            userType = 'Invited';
                        } else {
                            userType = 'Individual';
                        }
                    }
                } else { // No profile yet, use metadata
                    if (String(meta.group_id) === '2') { // Is an Agency
                        const plan = (meta.plan || '').split(' - ')[1];
                        if (plan === 'Standard') userType = 'Standard';
                        else if (plan === 'Advanced') userType = 'Advanced';
                        else userType = 'Starter';
                    } else if (meta.agency_id) { // Is an invited student
                        userType = 'Invited';
                    } else if (String(meta.group_id) !== '1') { // Not an admin
                        userType = 'Individual';
                    }
                }

                if (userType && dayCounts[userType] !== undefined) {
                    dayCounts[userType]++;
                }
             }
        }
    }

    const chartData = Array.from(dailyData.entries()).map(([date, counts]) => ({
        date: format(new Date(date), 'MMM d'),
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

       <Card>
          <CardHeader>
            <CardTitle>New Users Trend</CardTitle>
          </CardHeader>
          <AnalyticsControls />
          <CardContent className="pt-6">
             <div className="h-96 w-full">
               <AnalyticsChart data={chartData} />
             </div>
          </CardContent>
      </Card>
    </div>
  );
}
