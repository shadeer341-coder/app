
'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const rangePresets = [
    { value: '30d', label: 'Last 30 Days' },
    { value: '3m', label: 'Last 3 Months' },
    { value: '6m', label: 'Last 6 Months' },
    { value: '12m', label: 'Last 12 Months' },
    { value: 'custom', label: 'Custom Range' }
];

export function AnalyticsControls() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const initialRange = searchParams.get('range') || (searchParams.get('from') && searchParams.get('to') ? 'custom' : '30d');
    
    const [range, setRange] = useState(initialRange);
    const [fromDate, setFromDate] = useState<Date | undefined>(searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined);
    const [toDate, setToDate] = useState<Date | undefined>(searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined);

    const handlePresetChange = (value: string) => {
        setRange(value);
        if (value !== 'custom') {
            const params = new URLSearchParams(searchParams.toString());
            params.set('range', value);
            params.delete('from');
            params.delete('to');
            router.replace(`${pathname}?${params.toString()}`);
        }
    };

    const handleApplyCustomRange = () => {
        if (fromDate && toDate) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('from', format(fromDate, 'yyyy-MM-dd'));
            params.set('to', format(toDate, 'yyyy-MM-dd'));
            params.set('range', 'custom');
            router.replace(`${pathname}?${params.toString()}`);
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 border-b bg-muted/50">
            <div className="flex items-center gap-2">
                <Label htmlFor="date-range-preset" className="text-sm">Range</Label>
                <Select value={range} onValueChange={handlePresetChange}>
                    <SelectTrigger id="date-range-preset" className="w-[180px]">
                        <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                        {rangePresets.map(preset => (
                            <SelectItem key={preset.value} value={preset.value}>
                                {preset.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            {range === 'custom' && (
                <div className="flex flex-col md:flex-row items-center gap-2">
                    <DatePicker date={fromDate} setDate={setFromDate} />
                    <span className="text-muted-foreground text-sm">to</span>
                    <DatePicker date={toDate} setDate={setToDate} />
                    <Button onClick={handleApplyCustomRange} disabled={!fromDate || !toDate}>Apply</Button>
                </div>
            )}
        </div>
    );
}
