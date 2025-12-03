"use client";

import { usePathname, redirect } from 'next/navigation';
import { useEffect } from 'react';

type DashboardInitializerProps = {
    onboardingCompleted: boolean;
    children: React.ReactNode;
};

export function DashboardInitializer({ onboardingCompleted, children }: DashboardInitializerProps) {
    const pathname = usePathname();

    useEffect(() => {
        // If user has not completed onboarding and is not on the onboarding page, redirect them.
        if (!onboardingCompleted && pathname !== '/onboarding') {
            redirect('/onboarding');
        }
        
        // If user has completed onboarding and they are on the onboarding page, redirect to the main dashboard.
        if (onboardingCompleted && pathname === '/onboarding') {
            redirect('/dashboard');
        }
    }, [pathname, onboardingCompleted]);

    // If the user is not onboarded, we don't want to render the main dashboard layout at all.
    // So we'll just render the children, which in the un-onboarded case will be the onboarding page
    // loaded by Next.js router.
    if (!onboardingCompleted) {
        return null; // Or a loading spinner
    }

    return <>{children}</>;
}
