import 'server-only';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { User } from '@/lib/types';
import { users as mockUsers } from '@/lib/mock-data'; // Keep mock data for roles

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return null;
    }

    const { data: { user: aUser }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error getting user:', error);
      return null;
    }

    if (!aUser) {
      return null;
    }
    
    // This is a placeholder to merge Supabase user with mock role data.
    // In a real app, you would fetch the user's role from your own database
    // based on the user.id.
    const mockUser = mockUsers.find(u => u.email === aUser.email);
    const userMetadata = aUser.user_metadata;

    return {
      id: aUser.id,
      name: userMetadata.full_name || aUser.email || 'Unknown User',
      email: aUser.email || 'no-email@example.com',
      avatarUrl: userMetadata.avatar_url || `https://picsum.photos/seed/${aUser.id}/100/100`,
      role: mockUser?.role || 'user', // Default to 'user' if not found in mock data
      level: mockUser?.level || 'UG', // Default level
      agencyId: mockUser?.agencyId,
      onboardingCompleted: userMetadata.onboarding_completed || false,
      gender: userMetadata.gender,
      age: userMetadata.age,
      nationality: userMetadata.nationality,
      program: userMetadata.program,
      university: userMetadata.university,
      lastEducation: userMetadata.last_education,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
