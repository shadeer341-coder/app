
import { redirect } from 'next/navigation';

export default function UpdatePasswordPage() {
    // This page is obsolete. The password reset flow is now handled
    // within the login page component.
    redirect('/');
}
