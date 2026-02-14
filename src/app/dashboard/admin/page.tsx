
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { User } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export const dynamic = 'force-dynamic';

export default async function AdminPage({ searchParams }: { searchParams?: { [key: string]: string | undefined } }) {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== 'admin') {
        redirect('/dashboard');
    }
  
    const supabaseService = createSupabaseServiceRoleClient();

    const { data: authData, error: authError } = await supabaseService.auth.admin.listUsers({ perPage: 1000 });

    if (authError) {
        console.error("Error fetching auth users:", authError.message);
    }
    const authUsers = authData?.users || [];

    const userIds = authUsers.map(u => u.id);

    let allUsers: User[] = [];

    if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabaseService
            .from('profiles')
            .select('*')
            .in('id', userIds);

        if (profilesError) {
            console.error("Error fetching profiles:", profilesError.message);
        }

        const profilesMap = new Map(profiles?.map(p => [p.id, p]));

        allUsers = authUsers.map(authUser => {
            const profile = profilesMap.get(authUser.id);
            const dbRole = profile?.role;
            
            let finalRole: string;
            if (dbRole === 'super_admin') {
                finalRole = 'admin';
            } else if (dbRole === 'agency') {
                finalRole = 'agency';
            } else if (dbRole === 'individual' && profile?.agency_id) {
                finalRole = 'student';
            } else {
                finalRole = 'individual';
            }

            if (profile) {
                return {
                    id: authUser.id,
                    email: authUser.email || 'no-email@example.com',
                    name: profile.full_name || authUser.user_metadata?.full_name || 'Unnamed User',
                    avatarUrl: profile.avatar_url || `https://picsum.photos/seed/${authUser.id}/100/100`,
                    role: finalRole,
                    level: profile.level,
                    agencyId: profile.agency_id,
                    interview_quota: profile.interview_quota,
                    onboardingCompleted: profile.onboarding_completed,
                    gender: profile.gender,
                    age: profile.age,
                    nationality: profile.nationality,
                    program: profile.program,
                    university: profile.university,
                    lastEducation: profile.last_education,
                    agency_name: profile.agency_name,
                    agency_job_title: profile.agency_job_title,
                    agency_tier: profile.agency_tier,
                    agency_country: profile.agency_country,
                    mobile_number: profile.mobile_number,
                } as User;
            } else {
                const finalRole = authUser.user_metadata?.agency_id ? 'student' : 'individual';
                return {
                    id: authUser.id,
                    name: authUser.user_metadata?.full_name || 'Pending User',
                    email: authUser.email || 'no-email@example.com',
                    role: finalRole,
                    level: 'UG',
                    onboardingCompleted: false,
                    avatarUrl: `https://picsum.photos/seed/${authUser.id}/100/100`,
                    interview_quota: undefined,
                    agencyId: authUser.user_metadata?.agency_id,
                } as User;
            }
        });
    }

    const userTypeFilter = searchParams?.userType || 'all';
    let filteredUsers = allUsers;
    if (userTypeFilter !== 'all') {
        filteredUsers = allUsers.filter(user => user.role === userTypeFilter);
    }


    const sortBy = searchParams?.sortBy || 'name';
    const order = searchParams?.order || 'asc';

    filteredUsers.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;

        const key = sortBy as keyof User;
        
        const valA = a[key];
        const valB = b[key];

        if (key === 'interview_quota') {
            const numA = a.onboardingCompleted ? (valA as number ?? 0) : -1;
            const numB = b.onboardingCompleted ? (valB as number ?? 0) : -1;
            return order === 'asc' ? numA - numB : numB - numA;
        }

        if (key === 'role') {
            const roleA = a.role;
            const roleB = b.role;
            if (roleA! < roleB!) return order === 'asc' ? -1 : 1;
            if (roleA! > roleB!) return order === 'asc' ? 1 : -1;
            return 0;
        }

        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();

        if (strA < strB) return order === 'asc' ? -1 : 1;
        if (strA > strB) return order === 'asc' ? 1 : -1;
        return 0;
    });
  
  return (
    <AdminDashboardClient
        users={filteredUsers}
        sortBy={sortBy}
        order={order}
        userTypeFilter={userTypeFilter}
    />
  );
}
