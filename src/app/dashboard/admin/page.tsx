
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/lib/types";
import { RechargeUserDialog } from "@/components/admin/recharge-user-dialog";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== 'admin') {
        redirect('/dashboard');
    }
  
    const supabaseService = createSupabaseServiceRoleClient();

    const { data: authData, error: authError } = await supabaseService.auth.admin.listUsers({ perPage: 1000 });

    if (authError) {
        console.error("Error fetching auth users:", authError.message);
    }
    const authUsers = authData?.users || [];

    const userIds = authUsers.map(u => u.id);

    let allUsers: User[] = [];

    if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabaseService
            .from('profiles')
            .select('*')
            .in('id', userIds);

        if (profilesError) {
            console.error("Error fetching profiles:", profilesError.message);
        }

        const profilesMap = new Map(profiles?.map(p => [p.id, p]));

        allUsers = authUsers.map(authUser => {
            const profile = profilesMap.get(authUser.id);
            const role = profile?.role === 'super_admin' ? 'admin' : (profile?.role || 'individual');

            if (profile) {
                return {
                    id: authUser.id,
                    email: authUser.email || 'no-email@example.com',
                    name: profile.full_name || authUser.user_metadata?.full_name || 'Unnamed User',
                    avatarUrl: profile.avatar_url || `https://picsum.photos/seed/${authUser.id}/100/100`,
                    role: role,
                    level: profile.level,
                    agencyId: profile.agency_id,
                    interview_quota: profile.interview_quota,
                    onboardingCompleted: profile.onboarding_completed,
                } as User;
            } else {
                return {
                    id: authUser.id,
                    name: authUser.user_metadata?.full_name || 'Pending User',
                    email: authUser.email || 'no-email@example.com',
                    role: 'individual',
                    level: 'UG',
                    onboardingCompleted: false,
                    avatarUrl: `https://picsum.photos/seed/${authUser.id}/100/100`,
                } as User;
            }
        });
    }
  
  return (
    <div className="space-y-6">
       <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Admin Panel
          </h1>
          <p className="text-muted-foreground">
            System-wide user management.
          </p>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            View and manage all users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Agency ID</TableHead>
                    <TableHead>Quota</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {allUsers.map(user => (
                    <TableRow key={user.id}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                                    <AvatarFallback>{user.name?.charAt(0) ?? 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="font-medium">{user.name}</div>
                            </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                            <Badge variant={user.role === 'admin' ? 'destructive' : (user.role === 'agency' ? 'default' : 'secondary')}>{user.role}</Badge>
                        </TableCell>
                        <TableCell>{user.agencyId || 'N/A'}</TableCell>
                        <TableCell>{user.onboardingCompleted ? (user.interview_quota ?? 0) : 'Pending'}</TableCell>
                        <TableCell className="text-right">
                            {user.onboardingCompleted && user.role !== 'admin' && <RechargeUserDialog user={user} />}
                        </TableCell>
                    </TableRow>
                ))}
                 {allUsers.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No users found.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
