
import 'server-only';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { User } from '@/lib/types';

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
    // If there was an error, but it wasn't a "not found" error, we should log it but can proceed.
    // The most common error is `PGRST116`, where a row is not found for a .single() query.
    // In this case, we want to treat the user as a new user who needs onboarding.
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
    }
    
    // If no profile exists, the user has an auth entry but is not onboarded.
    // We create a default user object to send them to the onboarding flow.
    if (!profile) {
        return {
          id: session.user.id,
          email: session.user.email || 'no-email@example.com',
          name: session.user.user_metadata?.full_name || 'New User',
          avatarUrl: session.user.user_metadata?.avatar_url || `https://picsum.photos/seed/${session.user.id}/100/100`,
          role: 'user',
          level: 'UG',
          onboardingCompleted: false,
        };
    }

    return {
      id: session.user.id,
      email: session.user.email || 'no-email@example.com',
      name: profile.full_name || 'Unknown User',
      avatarUrl: profile.avatar_url || `https://picsum.photos/seed/${session.user.id}/100/100`,
      role: profile.role || 'user',
      level: profile.level || 'UG',
      agencyId: profile.agency_id,
      onboardingCompleted: profile.onboarding_completed || false,
      gender: profile.gender,
      age: profile.age,
      nationality: profile.nationality,
      program: profile.program,
      university: profile.university,
      lastEducation: profile.last_education,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
