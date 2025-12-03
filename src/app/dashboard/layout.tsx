import { redirect } from 'next/navigation';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Header } from "@/components/layout/header";
import { MainSidebar } from "@/components/layout/main-sidebar";
import { getCurrentUser } from "@/lib/auth";
import { DashboardInitializer } from '@/components/layout/dashboard-initializer';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  // DashboardInitializer will handle the redirect if onboarding is not complete.
  if (!user.onboardingCompleted) {
    return <DashboardInitializer onboardingCompleted={false}>{children}</DashboardInitializer>;
  }

  return (
    <SidebarProvider>
      <MainSidebar user={user} />
      <SidebarInset>
        <div className="flex min-h-screen flex-col">
        <Header user={user} />
        <main className="flex-1 p-4 md:p-8 pt-6">
            <DashboardInitializer onboardingCompleted={true}>
              {children}
            </DashboardInitializer>
        </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
