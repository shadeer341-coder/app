
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ShoppingCart, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const dynamic = 'force-dynamic';

export default async function AgencyUsagePage() {
    const user = await getCurrentUser();
    if (!user || user.role !== 'agency' || !user.agencyId) {
        redirect('/dashboard');
    }

    const supabase = createSupabaseServerClient({ service: true });

    // 1. Fetch agency's purchase history
    const { data: usageHistory, error: historyError } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .neq('purpose', 'register')
        .order('created_at', { ascending: false });

    if (historyError) {
        console.error("Error fetching usage history:", historyError.message);
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="font-headline text-3xl font-bold tracking-tight">
                        Quota Usage
                    </h1>
                    <p className="text-muted-foreground">
                        A complete history of your agency's attempt purchases and transfers.
                    </p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Error Loading History</CardTitle>
                        <CardDescription>We couldn't fetch your usage data right now. Please try again later.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    // 2. Get all unique student IDs from the history
    const studentIds = [...new Set(usageHistory
        ?.filter(h => h.purpose === 'Agency to Student Transfer' && h.given_to)
        .map(h => h.given_to as string) || [])];
    
    // 3. Fetch profiles for those students
    let studentProfilesMap = new Map();
    if (studentIds.length > 0) {
        const { data: studentProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', studentIds);
        
        if (profilesError) {
            console.error("Error fetching student profiles for usage history:", profilesError.message);
        } else if (studentProfiles) {
            studentProfilesMap = new Map(studentProfiles.map(p => [p.id, p]));
        }
    }

    const enrichedHistory = usageHistory?.map(entry => ({
        ...entry,
        student: entry.given_to ? studentProfilesMap.get(entry.given_to) : null,
    })) || [];

  return (
    <div className="space-y-6">
       <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Quota Usage
          </h1>
          <p className="text-muted-foreground">
            A complete history of your agency's attempt purchases and transfers.
          </p>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Usage History</CardTitle>
          <CardDescription>
            This log shows all quota transactions for your agency.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {enrichedHistory && enrichedHistory.length > 0 ? (
                    enrichedHistory.map(entry => (
                        <TableRow key={entry.id}>
                            <TableCell>
                                {format(new Date(entry.created_at), 'PPP')}
                            </TableCell>
                            <TableCell>
                                {entry.purpose === 'Purchase' && (
                                    <Badge variant="default">
                                        <ShoppingCart className="mr-1 h-3 w-3" />
                                        Purchase
                                    </Badge>
                                )}
                                {entry.purpose === 'Agency to Student Transfer' && (
                                     <Badge variant="secondary">
                                        <ArrowRightLeft className="mr-1 h-3 w-3" />
                                        Transfer
                                    </Badge>
                                )}
                                {entry.purpose === 'Admin Recharge' && (
                                     <Badge variant="outline">
                                        <ShieldCheck className="mr-1 h-3 w-3" />
                                        Admin Recharge
                                     </Badge>
                                )}
                            </TableCell>
                            <TableCell>
                                {entry.purpose === 'Purchase' && (
                                    `Purchased a bundle for $${entry.amount_spent}.`
                                )}
                                {entry.purpose === 'Agency to Student Transfer' && entry.student && (
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={(entry.student as any).avatar_url || ''} />
                                            <AvatarFallback>{(entry.student as any).full_name?.charAt(0) || 'S'}</AvatarFallback>
                                        </Avatar>
                                        <span>Transferred to {(entry.student as any).full_name}</span>
                                    </div>
                                )}
                                 {entry.purpose === 'Agency to Student Transfer' && !entry.student && (
                                    <span>Transferred to student ID: {entry.given_to}</span>
                                )}
                                {entry.purpose === 'Admin Recharge' && (
                                    <span>Quota added by an administrator.</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                {entry.purpose === 'Agency to Student Transfer' ? (
                                    <span className="text-destructive">-{entry.attempts}</span>
                                ) : (
                                    <span className="text-green-600">+{entry.attempts}</span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No usage history found.
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
