
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { subDays, startOfDay, parseISO, subMonths, subYears } from 'date-fns';
import { PurchasesClient } from "@/components/admin/purchases-client";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

const getDateRange = (range?: string, from?: string, to?: string) => {
    const toDate = to ? parseISO(to) : new Date();
    let fromDate;

    if (range === 'custom' && from) {
        fromDate = parseISO(from);
    } else {
        switch (range) {
            case '3m':
                fromDate = subMonths(new Date(), 3);
                break;
            case '6m':
                fromDate = subMonths(new Date(), 6);
                break;
            case '12m':
                fromDate = subYears(new Date(), 1);
                break;
            case '30d':
            default:
                fromDate = subDays(new Date(), 29);
                break;
        }
    }
    return { startDate: startOfDay(fromDate), endDate: toDate };
}


export default async function PurchasesPage({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== 'admin') {
        redirect('/dashboard');
    }

    const supabase = createSupabaseServiceRoleClient();
    const { startDate, endDate } = getDateRange(searchParams.range, searchParams.from, searchParams.to);
    
    const { data: purchases, error } = await supabase
        .from('purchases')
        .select('purpose, amount_spent')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

    if (error) {
        console.error("Error fetching purchases:", error.message);
        return <PurchasesClient error={error.message} />;
    }

    let registerAmount = 0;
    let purchaseAmount = 0;

    purchases?.forEach(p => {
        if (p.purpose === 'register') {
            registerAmount += p.amount_spent || 0;
        } else if (p.purpose === 'Purchase') {
            purchaseAmount += p.amount_spent || 0;
        }
    });

    const totalAmount = registerAmount + purchaseAmount;

    const pieChartData = [
        { name: 'Register', value: registerAmount, fill: 'hsl(var(--chart-1))' },
        { name: 'Purchase', value: purchaseAmount, fill: 'hsl(var(--chart-2))' },
    ];

    return (
        <PurchasesClient
            registerAmount={registerAmount}
            purchaseAmount={purchaseAmount}
            totalAmount={totalAmount}
            pieChartData={pieChartData}
        />
    );
}
