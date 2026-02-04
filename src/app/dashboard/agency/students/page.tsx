
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StudentManagement } from "@/components/agency/student-management";
import type { User } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';


export const dynamic = 'force-dynamic';

export default async function AgencyStudentsPage() {
  noStore();
  const user = await getCurrentUser();
  if (!user || user.role !== 'agency' || !user.agencyId) {
    redirect('/dashboard');
  }

  const supabase = createSupabaseServerClient();
  const supabaseService = createSupabaseServiceRoleClient();

  // 1. Fetch all users from Auth created by this agency, ensuring they are students (group_id: 1)
  const { data: authData, error: authError } = await supabaseService.auth.admin.listUsers({ perPage: 1000 });

  if (authError) {
    console.error("Error fetching auth users:", authError.message);
  }
  const agencyAuthUsers = authData?.users.filter(
      u => u.user_metadata?.agency_id === user.agencyId && String(u.user_metadata?.group_id) === '1'
  ) || [];


  // 2. Fetch all student profiles that are already onboarded for this agency
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('agency_id', user.agencyId)
    .eq('role', 'user'); // Only select users with the 'user' role

  if (profilesError) {
    console.error("Error fetching student profiles:", profilesError.message);
  }
  
  const onboardedProfiles = (profilesData as User[]) || [];
  const onboardedProfileIds = new Set(onboardedProfiles.map(p => p.id));

  // 3. Identify pending users (in auth but not in profiles)
  const pendingUsers: User[] = agencyAuthUsers
    .filter(authUser => !onboardedProfileIds.has(authUser.id))
    .map(authUser => ({
        id: authUser.id,
        name: authUser.user_metadata?.full_name || 'Pending User',
        email: authUser.email || 'no-email@example.com',
        role: 'user',
        status: 'pending',
        onboardingCompleted: false,
        avatarUrl: `https://picsum.photos/seed/${authUser.id}/100/100`,
        level: 'UG',
    }));

  // 4. Mark onboarded users as 'active'
  const activeUsers: User[] = onboardedProfiles.map(profile => ({
      ...profile,
      status: 'active',
  }));

  const allStudents = [...activeUsers, ...pendingUsers].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return (a.name || '').localeCompare(b.name || '');
  });
  
  return (
    <div className="space-y-6">
       <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Manage Students
          </h1>
          <p className="text-muted-foreground">
            Add, view, and manage all students in your agency.
          </p>
        </div>
        <StudentManagement students={allStudents} />
    </div>
  );
}
