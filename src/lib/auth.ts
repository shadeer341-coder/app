import 'server-only';
import { users } from '@/lib/mock-data';
import type { User } from '@/lib/types';

// In a real app, this would read from a session cookie or token.
export async function getCurrentUser(): Promise<User> {
  // To test different roles, change the index.
  // 0: user ('Alex Johnson')
  // 1: agency_admin ('Maria Garcia')
  // 2: admin ('Chen Wei')
  return Promise.resolve(users[0]);
}
