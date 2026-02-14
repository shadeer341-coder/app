'use client';

import { useState } from 'react';
import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserFilters } from "@/components/admin/user-filters";
import { UsersTable } from "@/components/admin/users-table";
import { UserDetailsPanel } from '@/components/admin/user-details-panel';
import { cn } from '@/lib/utils';

export function AdminDashboardClient({
    users,
    allUsers,
    sortBy,
    order,
    userTypeFilter
}: {
    users: User[],
    allUsers: User[],
    sortBy: string,
    order: string,
    userTypeFilter: string
}) {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    User Management
                </h1>
                <p className="text-muted-foreground">
                    View and manage all users in the system.
                </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                <div className={cn("transition-all duration-300", selectedUser ? "lg:col-span-3" : "lg:col-span-5")}>
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
                            <UsersTable
                                users={users}
                                sortBy={sortBy}
                                order={order}
                                userTypeFilter={userTypeFilter}
                                selectedUser={selectedUser}
                                onSelectUser={setSelectedUser}
                            />
                        </CardContent>
                    </Card>
                </div>
                {selectedUser && (
                    <div className="lg:col-span-2">
                        <UserDetailsPanel user={selectedUser} allUsers={allUsers} onClose={() => setSelectedUser(null)} />
                    </div>
                )}
            </div>
        </div>
    );
}
