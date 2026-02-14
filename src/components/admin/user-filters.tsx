
"use client";

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const userTypes = [
    { value: 'all', label: 'All Users' },
    { value: 'admin', label: 'Admin' },
    { value: 'agency', label: 'Agency' },
    { value: 'student', label: 'Student' },
    { value: 'individual', label: 'Individual' },
];

export function UserFilters() {
    const searchParams = useSearchParams();
    const { replace } = useRouter();
    const pathname = usePathname();

    const handleFilterChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', '1'); // Reset to first page on filter change
        if (value && value !== 'all') {
            params.set('userType', value);
        } else {
            params.delete('userType');
        }
        replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="flex items-center gap-2">
            <Label htmlFor="user-type-filter" className="text-sm whitespace-nowrap">Filter by role</Label>
            <Select
                defaultValue={searchParams.get('userType') || 'all'}
                onValueChange={handleFilterChange}
            >
                <SelectTrigger id="user-type-filter" className="w-full md:w-48">
                    <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                    {userTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
