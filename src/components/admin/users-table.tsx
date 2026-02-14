'use client';

import Link from 'next/link';
import type { User } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { RechargeUserDialog } from "@/components/admin/recharge-user-dialog";
import { Eye, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UsersTable({ 
    users, 
    sortBy, 
    order,
    userTypeFilter,
    selectedUser,
    onSelectUser
}: { 
    users: User[], 
    sortBy: string, 
    order: string,
    userTypeFilter: string
    selectedUser: User | null;
    onSelectUser: (user: User) => void;
}) {

    const getRoleDisplay = (user: User) => {
        if (user.role === 'admin') return { label: 'Admin', variant: 'destructive' as const };
        if (user.role === 'agency') return { label: 'Agency', variant: 'default' as const };
        if (user.role === 'student') return { label: 'Student', variant: 'secondary' as const };
        return { label: 'Individual', variant: 'outline' as const };
    }

    const getSortLink = (key: string) => {
        const newOrder = sortBy === key && order === 'asc' ? 'desc' : 'asc';
        let url = `/dashboard/admin?sortBy=${key}&order=${newOrder}`;
        if (userTypeFilter !== 'all') {
            url += `&userType=${userTypeFilter}`;
        }
        return url;
    };

    return (
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
                {users.map(user => {
                    const roleDisplay = getRoleDisplay(user);
                    const isSelected = selectedUser?.id === user.id;
                    return (
                        <TableRow 
                            key={user.id} 
                            data-selected={isSelected}
                            className={cn('transition-colors', isSelected && 'bg-primary/10')}
                        >
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
                            <TableCell>{user.onboardingCompleted ? (user.interview_quota ?? 0) : 'Pending'}</TableCell>
                            <TableCell className="text-right">
                                <div className="inline-flex items-center gap-1">
                                    <Button variant="outline" size="icon" onClick={() => onSelectUser(user)} className="h-8 w-8">
                                        <Eye className="h-4 w-4" />
                                        <span className="sr-only">View</span>
                                    </Button>
                                    {user.onboardingCompleted && user.role !== 'admin' && <RechargeUserDialog user={user} />}
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
                {users.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No users found.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
