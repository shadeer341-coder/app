
'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UserFilters } from "@/components/admin/user-filters";
import { UsersTable } from "@/components/admin/users-table";
import { UserDetailsPanel } from '@/components/admin/user-details-panel';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

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
    const searchParams = useSearchParams();
    const { replace } = useRouter();
    const pathname = usePathname();

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', '1'); // Reset to first page on search
        if (term) {
            params.set('q', term);
        } else {
            params.delete('q');
        }
        replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);

    return (
        <div className="space-y-6">
             <h1 className="font-headline text-3xl font-bold tracking-tight">
                User Management
            </h1>
            <p className="text-muted-foreground">
                View and manage all users in the system.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                <div className={cn("transition-all duration-300", selectedUser ? "lg:col-span-3" : "lg:col-span-5")}>
                    <Card>
                        <CardHeader>
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search by name or email..."
                                    defaultValue={searchParams.get('q') || ''}
                                    onChange={(e) => handleSearch(e.target.value)}
                                />
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
