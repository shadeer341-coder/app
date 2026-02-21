
'use server';

import { z } from 'zod';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { sendRechargeConfirmationEmail } from '@/lib/email';

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


export async function rechargeUserQuota(attemptsToAdd: number, amountSpent: number) {
  const user = await getCurrentUser();
  // Any user with the 'individual' role can use this. Agencies and admins cannot.
  if (!user || user.role !== 'individual') {
    return { success: false, message: "Permission denied. This action is for individuals only." };
  }
  
  if (typeof attemptsToAdd !== 'number' || attemptsToAdd <= 0) {
      return { success: false, message: "Invalid number of attempts provided." };
  }

  const supabase = createSupabaseServerActionClient();
  
  const currentQuota = user.interview_quota || 0;
  const newQuota = currentQuota + attemptsToAdd;

  const { error } = await supabase
    .from('profiles')
    .update({ interview_quota: newQuota })
    .eq('id', user.id);
  
  if (error) {
    console.error(`Failed to recharge quota for user ${user.id}. Error: ${error.message}`);
    return { success: false, message: "Could not update your quota. Please contact support." };
  }

  // Log the purchase event
  const { error: purchaseLogError } = await supabase
    .from('purchases')
    .insert({
      user_id: user.id,
      amount_spent: amountSpent,
      attempts: attemptsToAdd,
      purpose: 'Purchase',
      given_to: null,
    });

  if (purchaseLogError) {
    console.error(`Failed to log individual purchase for user ${user.id}. Error: ${purchaseLogError.message}`);
  }

  // Send confirmation email
  await sendRechargeConfirmationEmail({
    name: user.name,
    email: user.email,
    attemptsAdded: attemptsToAdd,
    newQuota: newQuota,
    isAgency: false,
  });

  revalidatePath('/dashboard/recharge');
  revalidatePath('/dashboard');
  
  return { success: true, message: `${attemptsToAdd} attempts added successfully.` };
}
