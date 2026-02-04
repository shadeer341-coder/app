
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { User } from '@/lib/types';

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createSupabaseServerClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
    if (profileError && profileError.code !== 'PGRST116') { // PGRST116: 0 rows
      console.error('Error fetching profile:', profileError);
    }
    
    if (!profile) {
        // This case handles users who have authenticated but not completed onboarding.
        return {
          id: user.id,
          email: user.email || 'no-email@example.com',
          name: user.user_metadata?.full_name || 'New User',
          avatarUrl: user.user_metadata?.avatar_url || `https://picsum.photos/seed/${user.id}/100/100`,
          role: 'user', // Default role
          level: 'UG', // Default level
          onboardingCompleted: false,
          interview_quota: 0,
        };
    }

    // Map super_admin to admin for consistent role checking in the app
    const role = profile.role === 'super_admin' ? 'admin' : profile.role;

    return {
      id: user.id,
      email: user.email || 'no-email@example.com',
      name: profile.full_name || 'Unknown User',
      avatarUrl: profile.avatar_url || `https://picsum.photos/seed/${user.id}/100/100`,
      role: role || 'user',
      level: profile.level || 'UG',
      agencyId: profile.agency_id,
      onboardingCompleted: profile.onboarding_completed || false,
      interview_quota: profile.interview_quota ?? 0,
      gender: profile.gender,
      age: profile.age,
      nationality: profile.nationality,
      program: profile.program,
      university: profile.university,
      lastEducation: profile.last_education,
      agency_name: profile.agency_name,
      agency_job_title: profile.agency_job_title,
      agency_tier: profile.agency_tier,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
