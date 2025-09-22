import { redirect } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { Header } from "@/components/layout/header";
import { MainSidebar } from "@/components/layout/main-sidebar";
import { getCurrentUser } from "@/lib/auth";

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
