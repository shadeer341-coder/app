
'use server';

import { z } from 'zod';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';

const profileSchema = z.object({
  full_name: z.string().min(2, "Full name is required."),
  gender: z.string().min(1, "Gender is required."),
  age: z.coerce.number().min(16, "You must be at least 16 years old.").max(100),
  nationality: z.string().min(1, "Nationality is required."),
});

export async function updateProfile(formData: z.infer<typeof profileSchema>) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "User not authenticated." };
  }

  const validatedData = profileSchema.safeParse(formData);

  if (!validatedData.success) {
    return { success: false, message: "Invalid data provided." };
  }

  const supabase = createSupabaseServerActionClient();
  const { error } = await supabase
    .from('profiles')
    .update(validatedData.data)
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    return { success: false, message: error.message };
  }

  // Revalidate paths to ensure updated data is shown across the app
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');

  return { success: true, message: "Profile updated successfully." };
}
