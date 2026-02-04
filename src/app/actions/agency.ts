
'use server';

import { z } from 'zod';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';

const programOptions = [
    { value: "Foundation + Degree", level: 'UG' },
    { value: "Degree (Undergraduate)", level: 'UG' },
    { value: "Top-Up / Final Year", level: 'UG' },
    { value: "Masters (Postgraduate)", level: 'PG' }
];

const createStudentSchema = z.object({
  full_name: z.string().min(2, "Full name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  gender: z.string().optional(),
  age: z.coerce.number().min(16).optional(),
  nationality: z.string().optional(),
  program: z.string().optional(),
  university: z.string().optional(),
  last_education: z.string().optional(),
});

export async function createStudentByAgency(formData: FormData) {
  const agencyUser = await getCurrentUser();
  if (!agencyUser || agencyUser.role !== 'agency' || !agencyUser.agencyId) {
    return { success: false, message: "Permission denied. You must be part of an agency to create students." };
  }

  const rawFormData = Object.fromEntries(formData.entries());
  
  const validatedData = createStudentSchema.safeParse(rawFormData);

  if (!validatedData.success) {
    const firstError = Object.values(validatedData.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, message: firstError || "Invalid data provided.", errors: validatedData.error.flatten().fieldErrors };
  }

  const { full_name, email, password, program, ...rest } = validatedData.data;

  const supabase = createSupabaseServerActionClient({ service: true });

  // Step 1: Create the user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // User will be sent a confirmation email
    user_metadata: {
      full_name,
    },
  });

  if (authError) {
    console.error('Error creating user in Auth:', authError);
    return { success: false, message: authError.message };
  }

  const newUserId = authData.user.id;
  
  const selectedProgram = programOptions.find(p => p.value === program);
  const level = selectedProgram?.level || 'UG';

  // Step 2: Create the profile in the profiles table
  const profileData = {
    id: newUserId,
    full_name,
    email,
    program,
    level,
    ...rest,
    role: 'user',
    onboarding_completed: true, // The agency is onboarding them
    interview_quota: 3, // Default quota for agency-created students
    agency_id: agencyUser.agencyId,
  };

  const { error: profileError } = await supabase.from('profiles').insert(profileData);

  if (profileError) {
    console.error('Error creating user profile:', profileError);
    // If profile creation fails, we should delete the auth user to prevent orphans.
    await supabase.auth.admin.deleteUser(newUserId);
    return { success: false, message: `Failed to create student profile: ${profileError.message}` };
  }

  revalidatePath('/dashboard/agency/students');
  return { success: true, message: `Student account for ${full_name} has been created.` };
}
