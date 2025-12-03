
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LoginPageClient } from '@/components/auth/login-page-client';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/dashboard');
  }

  return <LoginPageClient />;
}
