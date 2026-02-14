

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/lib/types";
import { RechargeUserDialog } from "@/components/admin/recharge-user-dialog";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from 'next/link';
import { ArrowUp, ArrowDown } from "lucide-react";
import { UserFilters } from "@/components/admin/user-filters";

export const dynamic = 'force-dynamic';

export default async function AdminPage({ searchParams }: { searchParams?: { [key: string]: string | undefined } }) {
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
                    interview_quota: undefined,
                    agencyId: authUser.user_metadata?.agency_id,
                } as User;
            }
        });
    }

    const userTypeFilter = searchParams?.userType || 'all';
    let filteredUsers = allUsers;
    if (userTypeFilter !== 'all') {
        filteredUsers = allUsers.filter(user => {
            if (userTypeFilter === 'admin') return user.role === 'admin';
            if (userTypeFilter === 'agency') return user.role === 'agency';
            if (userTypeFilter === 'student') return user.role === 'individual' && !!user.agencyId;
            if (userTypeFilter === 'individual') return user.role === 'individual' && !user.agencyId;
            return true;
        });
    }


    const sortBy = searchParams?.sortBy || 'name';
    const order = searchParams?.order || 'asc';

    filteredUsers.sort((a, b) => {
        const key = sortBy as keyof User;
        
        const valA = a[key];
        const valB = b[key];

        if (key === 'interview_quota') {
            const numA = a.onboardingCompleted ? (valA as number ?? 0) : -1;
            const numB = b.onboardingCompleted ? (valB as number ?? 0) : -1;
            return order === 'asc' ? numA - numB : numB - numA;
        }

        if (key === 'role') {
            const roleA = a.role === 'individual' ? (a.agencyId ? 'student' : 'individual') : a.role;
            const roleB = b.role === 'individual' ? (b.agencyId ? 'student' : 'individual') : b.role;
            if (roleA < roleB) return order === 'asc' ? -1 : 1;
            if (roleA > roleB) return order === 'asc' ? 1 : -1;
            return 0;
        }

        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();

        if (strA < strB) return order === 'asc' ? -1 : 1;
        if (strA > strB) return order === 'asc' ? 1 : -1;
        return 0;
    });

    const getSortLink = (key: string) => {
        const newOrder = sortBy === key && order === 'asc' ? 'desc' : 'asc';
        return `/dashboard/admin?sortBy=${key}&order=${newOrder}${userTypeFilter !== 'all' ? `&userType=${userTypeFilter}`: ''}`;
    };

    const getRoleDisplay = (user: User) => {
        if (user.role === 'admin') return { label: 'Admin', variant: 'destructive' as const };
        if (user.role === 'agency') return { label: 'Agency', variant: 'default' as const };
        if (user.role === 'individual' && user.agencyId) return { label: 'Student', variant: 'secondary' as const };
        return { label: 'Individual', variant: 'outline' as const };
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage all users in the system.
              </CardDescription>
            </div>
            <UserFilters />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>
                         <Link href={getSortLink('name')} className="flex items-center gap-1 hover:underline">
                            User
                            {sortBy === 'name' && (order === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />)}
                        </Link>
                    </TableHead>
                    <TableHead>
                        <Link href={getSortLink('email')} className="flex items-center gap-1 hover:underline">
                            Email
                            {sortBy === 'email' && (order === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />)}
                        </Link>
                    </TableHead>
                    <TableHead>
                         <Link href={getSortLink('role')} className="flex items-center gap-1 hover:underline">
                            Role
                            {sortBy === 'role' && (order === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />)}
                        </Link>
                    </TableHead>
                    <TableHead>Agency ID</TableHead>
                    <TableHead>
                        <Link href={getSortLink('interview_quota')} className="flex items-center gap-1 hover:underline">
                            Quota
                            {sortBy === 'interview_quota' && (order === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />)}
                        </Link>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredUsers.map(user => {
                    const roleDisplay = getRoleDisplay(user);
                    return (
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
                                <Badge variant={roleDisplay.variant}>{roleDisplay.label}</Badge>
                            </TableCell>
                            <TableCell>{user.agencyId || 'N/A'}</TableCell>
                            <TableCell>{user.onboardingCompleted ? (user.interview_quota ?? 0) : 'Pending'}</TableCell>
                            <TableCell className="text-right">
                                {user.onboardingCompleted && user.role !== 'admin' && <RechargeUserDialog user={user} />}
                            </TableCell>
                        </TableRow>
                    );
                })}
                 {filteredUsers.length === 0 && (
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
