
'use server';

import { z } from 'zod';
import { createSupabaseServiceRoleClient, createSupabaseServerActionClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { sendWelcomeEmail, sendRechargeConfirmationEmail } from '@/lib/email';


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

  // Check if the agency has enough quota to add a new student
  if (agencyUser.interview_quota === undefined || agencyUser.interview_quota === null || agencyUser.interview_quota < 3) {
    return { success: false, message: "You need at least 3 attempts to create a new student. Please recharge your plan." };
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
      group_id: 3,
      agency_id: agencyId,
      password_is_temporary: true
    },
  });

  if (authError) {
    console.error('Error creating user in Auth:', authError);
    return { success: false, message: authError.message };
  }

  let successMessage = `Student account for ${full_name} has been created.`;

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

    // Decrement the agency's interview quota
    const newQuota = (agencyUser.interview_quota || 0) - 3;
    const { error: quotaError } = await supabase
      .from('profiles')
      .update({ interview_quota: newQuota })
      .eq('id', agencyUser.id); // Update the agency's profile
    
    if (quotaError) {
      // This is a non-fatal error for the user but critical for system integrity. Log it.
      // We can't easily roll back the auth user creation, so we log and proceed.
      console.error(`CRITICAL: Student created for agency ${agencyUser.id}, but failed to decrement quota. Error: ${quotaError.message}`);
    }

    // Send welcome email
    const emailResult = await sendWelcomeEmail({
        name: full_name,
        email: email,
        plan: "Student",
        tempPassword: password,
    });

    if (!emailResult.success) {
        successMessage += " However, the welcome email could not be sent. Please share the temporary password with them manually."
        console.error(`Failed to send welcome email to ${email}: ${emailResult.message}`);
    }
  }


  revalidatePath('/dashboard/students');
  return { success: true, message: successMessage };
}


export async function rechargeAgencyQuota(attemptsToAdd: number, amountSpent: number) {
  const agencyUser = await getCurrentUser();
  if (!agencyUser || agencyUser.role !== 'agency') {
    return { success: false, message: "Permission denied. You must be an agency to recharge quota." };
  }
  
  if (typeof attemptsToAdd !== 'number' || attemptsToAdd <= 0) {
      return { success: false, message: "Invalid number of attempts provided." };
  }

  const supabase = createSupabaseServerActionClient();
  
  const currentQuota = agencyUser.interview_quota || 0;
  const newQuota = currentQuota + attemptsToAdd;

  const { error } = await supabase
    .from('profiles')
    .update({ interview_quota: newQuota })
    .eq('id', agencyUser.id);
  
  if (error) {
    console.error(`CRITICAL: Failed to recharge quota for agency ${agencyUser.id}. Error: ${error.message}`);
    return { success: false, message: "Could not update your quota. Please contact support." };
  }

  // Log the purchase event
  const { error: purchaseLogError } = await supabase
    .from('purchases')
    .insert({
      user_id: agencyUser.id,
      amount_spent: amountSpent,
      attempts: attemptsToAdd,
      purpose: 'Purchase',
      given_to: null,
    });
  
  if (purchaseLogError) {
      console.error(`Failed to log agency purchase for agency ${agencyUser.id}. Error: ${purchaseLogError.message}`);
  }

  // Send confirmation email
  await sendRechargeConfirmationEmail({
    name: agencyUser.name,
    email: agencyUser.email,
    attemptsAdded: attemptsToAdd,
    newQuota: newQuota,
    isAgency: true,
  });

  revalidatePath('/dashboard/recharge');
  revalidatePath('/dashboard');
  
  return { success: true, message: `${attemptsToAdd} attempts added successfully.` };
}


export async function addQuotaToStudent(studentId: string, attemptsToAdd: number) {
    const agencyUser = await getCurrentUser();
    if (!agencyUser || agencyUser.role !== 'agency' || !agencyUser.agencyId) {
        return { success: false, message: "Permission denied." };
    }

    if (typeof attemptsToAdd !== 'number' || attemptsToAdd <= 0) {
        return { success: false, message: "Invalid number of attempts provided." };
    }

    const supabase = createSupabaseServiceRoleClient(); // Use service role to bypass RLS for this internal operation

    // 1. Check if agency has enough quota to give
    if ((agencyUser.interview_quota || 0) < attemptsToAdd) {
        return { success: false, message: `You don't have enough quota. You have ${agencyUser.interview_quota || 0} attempts left.` };
    }
    
    // 2. Fetch the student profile to ensure they belong to the agency
    const { data: student, error: studentError } = await supabase
        .from('profiles')
        .select('id, agency_id, interview_quota')
        .eq('id', studentId)
        .single();
    
    if (studentError || !student) {
        return { success: false, message: "Student profile not found." };
    }

    if (student.agency_id !== agencyUser.agencyId) {
        return { success: false, message: "This student does not belong to your agency." };
    }

    // All checks passed, perform the transaction
    try {
        // 3. Decrement agency quota
        const newAgencyQuota = (agencyUser.interview_quota || 0) - attemptsToAdd;
        const { error: agencyUpdateError } = await supabase
            .from('profiles')
            .update({ interview_quota: newAgencyQuota })
            .eq('id', agencyUser.id);
        
        if (agencyUpdateError) throw agencyUpdateError;

        // 4. Increment student quota
        const newStudentQuota = (student.interview_quota || 0) + attemptsToAdd;
        const { error: studentUpdateError } = await supabase
            .from('profiles')
            .update({ interview_quota: newStudentQuota })
            .eq('id', studentId);
            
        if (studentUpdateError) throw studentUpdateError;

        // Log the transfer event
        const { error: purchaseLogError } = await supabase
            .from('purchases')
            .insert({
                user_id: agencyUser.id,
                amount_spent: 0,
                attempts: attemptsToAdd,
                purpose: 'Agency to Student Transfer',
                given_to: studentId,
            });

        if (purchaseLogError) {
            console.error(`Failed to log quota transfer from agency ${agencyUser.id} to student ${studentId}. Error: ${purchaseLogError.message}`);
        }

        revalidatePath(`/dashboard/students/${studentId}`);
        revalidatePath('/dashboard/students');
        revalidatePath('/dashboard');

        return { success: true, message: `${attemptsToAdd} attempts added to student successfully.` };

    } catch(error: any) {
        console.error(`CRITICAL: Failed to transfer quota from agency ${agencyUser.id} to student ${studentId}. Error: ${error.message}`);
        // Here we should ideally roll back the agency quota decrement if it happened.
        // For now, we'll just log the critical failure.
        return { success: false, message: "A critical error occurred while transferring quota. Please contact support." };
    }
}
