import 'server-only';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { User } from '@/lib/types';
import { users as mockUsers } from '@/lib/mock-data'; // Keep mock data for roles

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return null;
    }

    const user = session.user;

    // This is a placeholder to merge Supabase user with mock role data.
    // In a real app, you would fetch the user's role from your own database
    // based on the user.id.
    const mockUser = mockUsers.find(u => u.email === user.email);

    return {
      id: user.id,
      name: user.user_metadata.full_name || user.email || 'Unknown User',
      email: user.email || 'no-email@example.com',
      avatarUrl: user.user_metadata.avatar_url || `https://picsum.photos/seed/${user.id}/100/100`,
      role: mockUser?.role || 'user', // Default to 'user' if not found in mock data
      level: mockUser?.level || 'UG', // Default level
      agencyId: mockUser?.agencyId,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
