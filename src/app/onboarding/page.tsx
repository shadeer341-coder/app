
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { OnboardingPageClient } from '@/components/auth/onboarding-page-client';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  // If the user has already completed onboarding, send them to the dashboard.
  if (user.onboardingCompleted) {
    redirect('/dashboard');
  }

  return <OnboardingPageClient />;
}
