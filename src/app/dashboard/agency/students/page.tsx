

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

  // 1. Fetch all users from Auth created by this agency, ensuring they are students (group_id: 3)
  const { data: authData, error: authError } = await supabaseService.auth.admin.listUsers({ perPage: 1000 });

  if (authError) {
    console.error("Error fetching auth users:", authError.message);
  }
  const agencyAuthUsers = authData?.users.filter(
      u => u.user_metadata?.agency_id === user.agencyId && String(u.user_metadata?.group_id) === '3'
  ) || [];

  const studentIds = agencyAuthUsers.map(u => u.id);
  
  let allStudents: User[] = [];

  if (studentIds.length > 0) {
    // 2. Fetch all existing profiles for these students
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', studentIds);

    if (profilesError) {
      console.error("Error fetching profiles for students:", profilesError.message);
    }

    const profilesMap = new Map(profiles?.map(p => [p.id, p as User]));

    // 3. Construct the list of all students, determining their status
    allStudents = agencyAuthUsers.map(authUser => {
      const profile = profilesMap.get(authUser.id);
      
      if (profile) {
        // Active student (profile exists)
        return {
          ...profile,
          id: authUser.id,
          email: authUser.email || 'no-email@example.com',
          name: profile.full_name || authUser.user_metadata?.full_name || 'Unnamed User',
          avatarUrl: profile.avatar_url || `https://picsum.photos/seed/${authUser.id}/100/100`,
          status: 'active',
          onboardingCompleted: true,
        };
      } else {
        // Pending student (no profile yet)
        return {
          id: authUser.id,
          name: authUser.user_metadata?.full_name || 'Pending User',
          email: authUser.email || 'no-email@example.com',
          role: 'user',
          status: 'pending',
          onboardingCompleted: false,
          avatarUrl: `https://picsum.photos/seed/${authUser.id}/100/100`,
          level: 'UG',
        };
      }
    });
  }

  allStudents.sort((a, b) => {
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
