
'use server';

import { z } from 'zod';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';


const createStudentSchema = z.object({
  full_name: z.string().min(2, "Full name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

export async function createStudentByAgency(formData: FormData) {
  const agencyUser = await getCurrentUser();
  if (!agencyUser || agencyUser.role !== 'agency') {
    return { success: false, message: "Permission denied. You must be an agency to create students." };
  }

  const supabase = createSupabaseServiceRoleClient();
  let agencyId = agencyUser.agencyId;

  // This is a self-healing mechanism. If an agency user from the old system
  // doesn't have an agencyId, we assign their own user ID as the agencyId.
  if (!agencyId) {
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ agency_id: agencyUser.id })
        .eq('id', agencyUser.id);
    
    if (updateError) {
        console.error('Error self-assigning agency_id:', updateError);
        return { success: false, message: "Could not initialize your agency profile. Please contact support." };
    }
    agencyId = agencyUser.id;
  }


  const rawFormData = Object.fromEntries(formData.entries());
  
  const validatedData = createStudentSchema.safeParse(rawFormData);

  if (!validatedData.success) {
    const firstError = Object.values(validatedData.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, message: firstError || "Invalid data provided.", errors: validatedData.error.flatten().fieldErrors };
  }

  const { full_name, email, password } = validatedData.data;

  // Create the user in Supabase Auth with specific metadata
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Corresponds to email_verified: true
    user_metadata: {
      full_name,
      plan: "Individual",
      group_id: 1,
      agency_id: agencyId,
      password_is_temporary: true
    },
  });

  if (authError) {
    console.error('Error creating user in Auth:', authError);
    return { success: false, message: authError.message };
  }

  // Per your request, skip the profiles row. Since a trigger automatically
  // creates it, we will now delete it to keep the table clean.
  if (authData.user) {
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', authData.user.id);
    
    if (deleteError) {
      // This is not a critical error for the user, but good to log.
      // The student account was still created successfully.
      console.warn(`User auth account was created, but their auto-generated profile row could not be deleted. Error: ${deleteError.message}`);
    }
  }


  revalidatePath('/dashboard/agency/students');
  return { success: true, message: `Student account for ${full_name} has been created.` };
}
