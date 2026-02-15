"use client";

import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Header } from "@/components/layout/header";
import { MainSidebar } from "@/components/layout/main-sidebar";
import { DashboardInitializer } from '@/components/layout/dashboard-initializer';
import type { User } from '@/lib/types';

export function DashboardLayoutProvider({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPracticePage = pathname.startsWith('/dashboard/practice');

  // The DashboardInitializer handles the onboarding redirect logic
  return (
    <DashboardInitializer onboardingCompleted={user.onboardingCompleted}>
      {isPracticePage ? (
        // For the practice page, we render children directly. The specific layout for
        // the practice page is already wrapping them.
        <>{children}</>
      ) : (
        // For all other dashboard pages, we render the full layout with nav
        <SidebarProvider>
          <MainSidebar user={user} />
          <SidebarInset>
            <div className="flex min-h-screen flex-col">
              <Header user={user} />
              <main className="flex-1 p-4 md:p-8 pt-6 animate-fade-in-up">
                {children}
              </main>
            </div>
          </SidebarInset>
        </SidebarProvider>
      )}
    </DashboardInitializer>
  );
}
