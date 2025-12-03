import { redirect } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { Header } from "@/components/layout/header";
import { MainSidebar } from "@/components/layout/main-sidebar";
import { getCurrentUser } from "@/lib/auth";
import { usePathname } from 'next/navigation';

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

  // If user has not completed onboarding and is not on the onboarding page, redirect them.
  if (!user.onboardingCompleted && !/^\/dashboard\/onboarding(\/.*)?$/.test(usePathname())) {
    redirect('/dashboard/onboarding');
  }
  
  // If user has completed onboarding and they are on the onboarding page, redirect to dashboard.
  if (user.onboardingCompleted && /^\/dashboard\/onboarding(\/.*)?$/.test(usePathname())) {
    redirect('/dashboard');
  }


  return (
    <SidebarProvider>
      <MainSidebar user={user} />
      <SidebarInset>
        <div className="flex min-h-screen flex-col">
          <Header user={user} />
          <main className="flex-1 p-4 md:p-8 pt-6">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
