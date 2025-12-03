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

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return null;
    }
    
    if (!profile) {
        return null;
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
