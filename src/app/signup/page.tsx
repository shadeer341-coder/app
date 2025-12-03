
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { SignupPageClient } from '@/components/auth/signup-page-client';

export const dynamic = 'force-dynamic';

export default async function SignupPage() {
    const user = await getCurrentUser();

    if (user) {
        redirect('/dashboard');
    }

    return <SignupPageClient />;
}
