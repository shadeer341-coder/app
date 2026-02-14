
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PaginationControls } from "@/components/ui/pagination";

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 10;

type AgencyWithStudentCount = User & { student_count: number };

export default async function ManageAgenciesPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
    const supabase = createSupabaseServiceRoleClient();
    const currentPage = Number(searchParams?.page || 1);

    const { count: totalAgencies } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'agency');

    // --- Paginated Agencies Query ---
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data: agencies, error: agenciesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'agency')
        .order('created_at', { ascending: false })
        .range(from, to);

    if (agenciesError) {
        console.error("Error fetching agencies:", agenciesError.message);
    }
    
    let agenciesWithStudentCounts: AgencyWithStudentCount[] = [];

    if (agencies && agencies.length > 0) {
        const agencyIds = agencies.map(a => a.id);
        
        const studentCountPromises = agencyIds.map(id => 
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('agency_id', id).neq('role', 'agency')
        );
        
        const studentCountsResults = await Promise.all(studentCountPromises);
        
        const studentCountsMap = new Map(agencyIds.map((id, index) => [id, studentCountsResults[index].count || 0]));

        agenciesWithStudentCounts = agencies.map(agency => ({
            ...(agency as User),
            student_count: studentCountsMap.get(agency.id) || 0,
        }));
    }

    const totalPages = Math.ceil((totalAgencies || 0) / ITEMS_PER_PAGE);
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    Agency Management
                </h1>
                <p className="text-muted-foreground">
                    An overview of all registered agencies in the system.
                </p>
            </div>

            <Card>
                <CardHeader>
                <CardTitle>All Agencies</CardTitle>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Agency</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Tier</TableHead>
                            <TableHead>Students</TableHead>
                            <TableHead>Quota Left</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {agenciesWithStudentCounts.map(agency => (
                            <TableRow key={agency.id}>
                                <TableCell>
                                    <div className="font-medium">{agency.agency_name || 'Unnamed Agency'}</div>
                                    <div className="text-xs text-muted-foreground">{agency.agency_country || 'N/A'}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 hidden md:flex">
                                            <AvatarImage src={agency.avatarUrl} alt={agency.name} />
                                            <AvatarFallback>{agency.name?.charAt(0) ?? 'A'}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium">{agency.name}</div>
                                            <div className="text-xs text-muted-foreground">{agency.email}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={agency.agency_tier === 'Advanced' ? 'default' : (agency.agency_tier === 'Standard' ? 'secondary' : 'outline')}>{agency.agency_tier || 'N/A'}</Badge>
                                </TableCell>
                                <TableCell>{agency.student_count}</TableCell>
                                <TableCell>{agency.interview_quota ?? 0}</TableCell>
                            </TableRow>
                        ))}
                        {agenciesWithStudentCounts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No agencies found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                </CardContent>
                {totalPages > 1 && (
                    <CardFooter>
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                        />
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
