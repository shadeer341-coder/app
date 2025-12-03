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
        // If user has not completed onboarding and is not on an onboarding-related page, redirect them.
        if (!onboardingCompleted && !pathname.startsWith('/dashboard/onboarding')) {
            redirect('/dashboard/onboarding');
        }
        
        // If user has completed onboarding and they are on the onboarding page, redirect to the main dashboard.
        if (onboardingCompleted && pathname.startsWith('/dashboard/onboarding')) {
            redirect('/dashboard');
        }
    }, [pathname, onboardingCompleted]);

    // While redirection logic is processing, we can show the children or a loader.
    // Showing children prevents a layout shift.
    return <>{children}</>;
}
