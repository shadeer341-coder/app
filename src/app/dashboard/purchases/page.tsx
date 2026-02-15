
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { subDays, startOfDay, parseISO, subMonths, subYears, format } from 'date-fns';
import { PurchasesClient } from "@/components/admin/purchases-client";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 10;

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
    const currentPage = Number(searchParams?.page || 1);
    
    // --- Data for Stats and Pie Chart ---
    const { data: purchasesForStats, error: statsError } = await supabase
        .from('purchases')
        .select('purpose, amount_spent')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

    // --- Data for History Table ---
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

     const { data: purchasesForTable, error: tableError, count } = await supabase
        .from('purchases')
        .select(`*, user_id, given_to`, { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .range(from, to);

    // --- Enrich data with user profiles ---
    const userIds = new Set<string>();
    purchasesForTable?.forEach(p => {
        if (p.user_id) userIds.add(p.user_id);
        if (p.given_to) userIds.add(p.given_to);
    });

    let profilesMap = new Map();
    if (userIds.size > 0) {
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .in('id', Array.from(userIds));

        if (profilesError) console.error("Error fetching profiles for purchases:", profilesError);
        else profilesMap = new Map(profiles.map(p => [p.id, p]));
    }
    
    const enrichedPurchases = purchasesForTable?.map(p => ({
        ...p,
        purchaser: p.user_id ? profilesMap.get(p.user_id) : null,
        recipient: p.given_to ? profilesMap.get(p.given_to) : null,
        formatted_date: format(new Date(p.created_at), "d MMM yyyy"),
    })) || [];


    // --- Calculate Stats ---
    const error = statsError?.message || tableError?.message;
    if (error) {
        console.error("Error fetching purchases:", error);
        return <PurchasesClient error={error} purchases={[]} currentPage={1} totalPages={1} />;
    }

    let registerAmount = 0;
    let purchaseAmount = 0;

    purchasesForStats?.forEach(p => {
        if (p.purpose === 'register') {
            registerAmount += p.amount_spent || 0;
        } else if (p.purpose === 'Purchase') {
            purchaseAmount += p.amount_spent || 0;
        }
    });

    const totalAmount = registerAmount + purchaseAmount;
    const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

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
            purchases={enrichedPurchases}
            currentPage={currentPage}
            totalPages={totalPages}
        />
    );
}
