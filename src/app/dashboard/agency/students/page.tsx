
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StudentManagement } from "@/components/agency/student-management";
import type { User } from "@/lib/types";

export const dynamic = 'force-dynamic';

export default async function AgencyStudentsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'agency') {
    redirect('/dashboard');
  }

  const supabase = createSupabaseServerClient();

  const { data: studentsData, error } = user.agencyId 
    ? await supabase
      .from('profiles')
      .select('*')
      .eq('agency_id', user.agencyId)
      .order('created_at', { ascending: false })
    : { data: null, error: null };


  if (error) {
    console.error("Error fetching students:", error.message);
  }

  const students = (studentsData as unknown as User[]) || [];
  
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
        <StudentManagement students={students} />
    </div>
  );
}
