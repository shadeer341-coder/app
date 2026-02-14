
'use server';

import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function rechargeUserQuotaByAdmin(userId: string, attemptsToAdd: number) {
  const adminUser = await getCurrentUser();
  if (!adminUser || adminUser.role !== 'admin') {
    return { success: false, message: 'Permission denied. Only admins can perform this action.' };
  }

  if (!userId || typeof attemptsToAdd !== 'number' || attemptsToAdd <= 0) {
    return { success: false, message: 'Invalid user ID or number of attempts.' };
  }

  const supabase = createSupabaseServiceRoleClient();

  const { data: userProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('interview_quota')
    .eq('id', userId)
    .single();

  if (fetchError || !userProfile) {
    return { success: false, message: 'User profile not found.' };
  }

  const currentQuota = userProfile.interview_quota || 0;
  const newQuota = currentQuota + attemptsToAdd;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ interview_quota: newQuota })
    .eq('id', userId);

  if (updateError) {
    console.error(`Failed to recharge quota for user ${userId}. Error: ${updateError.message}`);
    return { success: false, message: 'Failed to update quota.' };
  }

  // Log the purchase/recharge event
  const { error: purchaseLogError } = await supabase
    .from('purchases')
    .insert({
      user_id: adminUser.id,
      amount_spent: 0,
      attempts: attemptsToAdd,
      purpose: 'Admin Recharge',
      given_to: userId,
    });

  if (purchaseLogError) {
    console.error(`Failed to log purchase for admin recharge. User: ${userId}, Admin: ${adminUser.id}. Error: ${purchaseLogError.message}`);
    // This is a non-critical error for the user, so we don't return an error message to them.
  }

  revalidatePath('/dashboard/admin');
  
  return { success: true, message: `${attemptsToAdd} attempts added successfully to user.` };
}
