import { redirect } from 'next/navigation';
import { getCurrentUser } from "@/lib/auth";
import { DashboardLayoutProvider } from './dashboard-layout-provider';

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

  // The provider will conditionally render the correct layout
  return (
    <DashboardLayoutProvider user={user}>
      {children}
    </DashboardLayoutProvider>
  );
}
