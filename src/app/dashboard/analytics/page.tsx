
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Building } from "lucide-react";

export const dynamic = 'force-dynamic';

type UserCategory = 'Individual' | 'Invited' | 'Starter' | 'Standard' | 'Advanced' | null;

export default async function AnalyticsPage() {

    const supabase = createSupabaseServiceRoleClient();
    
    // --- AUTH & PROFILE DATA FETCH ---
    const { data: authData, error: authUsersError } = await supabase.auth.admin.listUsers({ perPage: 1000 }); 
    if (authUsersError) console.error("Error fetching auth users:", authUsersError.message);
    const allAuthUsers = authData?.users || [];

    const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('id, role, agency_tier, from_agency');
    if (profilesError) console.error("Error fetching profiles:", profilesError.message);
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

    // --- STATS CARDS (TOTALS) ---
    let individualCount = 0;
    let invitedCount = 0;
    let starterCount = 0;
    let standardCount = 0;
    let advancedCount = 0;
    
    const getUserCategory = (authUser: any, profile: any): UserCategory => {
        const meta = authUser.user_metadata || {};
        if (profile) { // User has a profile (onboarding completed)
            if (profile.role === 'agency') {
                if (profile.agency_tier === 'Standard') return 'Standard';
                if (profile.agency_tier === 'Advanced') return 'Advanced';
                return 'Starter';
            } else if (profile.role !== 'admin' && profile.role !== 'super_admin') {
                return profile.from_agency ? 'Invited' : 'Individual';
            }
        } else { // No profile yet, use metadata
            if (String(meta.group_id) === '2') { // Is an Agency
                const plan = (meta.plan || '').split(' - ')[1];
                if (plan === 'Standard') return 'Standard';
                if (plan === 'Advanced') return 'Advanced';
                return 'Starter';
            } else if (meta.agency_id) { // Is an invited student
                return 'Invited';
            } else if (String(meta.group_id) !== '1') { // Not an admin
                return 'Individual';
            }
        }
        return null;
    };
    
    allAuthUsers.forEach(authUser => {
        const profile = profilesMap.get(authUser.id);
        const category = getUserCategory(authUser, profile);

        switch (category) {
            case 'Individual': individualCount++; break;
            case 'Invited': invitedCount++; break;
            case 'Starter': starterCount++; break;
            case 'Standard': standardCount++; break;
            case 'Advanced': advancedCount++; break;
        }
    });

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
    </div>
  );
}
