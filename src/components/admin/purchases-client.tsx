
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Landmark, ArrowRightLeft, ShieldCheck, UserPlus, ShoppingBag } from "lucide-react";
import { PurchasesControls } from "./purchases-controls";
import { PurchasesPieChart } from "./purchases-pie-chart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/ui/pagination";

type PieChartData = {
    name: string;
    value: number;
    fill: string;
}[];

type PurchasesClientProps = {
    registerAmount?: number;
    purchaseAmount?: number;
    totalAmount?: number;
    pieChartData?: PieChartData;
    purchases: any[];
    currentPage: number;
    totalPages: number;
    error?: string;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export function PurchasesClient({ 
    registerAmount = 0, 
    purchaseAmount = 0, 
    totalAmount = 0, 
    pieChartData = [],
    purchases,
    currentPage,
    totalPages,
    error 
}: PurchasesClientProps) {

    if (error && !purchases.length) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    Could not load purchase data. Please try again later. <br />
                    <span className="text-xs">{error}</span>
                </AlertDescription>
            </Alert>
        )
    }

    const getIconAndLabel = (purpose: string) => {
        switch (purpose) {
            case 'Purchase': return { icon: ShoppingCart, label: 'Purchase', variant: 'default' as const };
            case 'register': return { icon: UserPlus, label: 'Register', variant: 'default' as const };
            case 'Agency to Student Transfer': return { icon: ArrowRightLeft, label: 'Transfer', variant: 'secondary' as const };
            case 'Admin Recharge': return { icon: ShieldCheck, label: 'Admin Gift', variant: 'outline' as const };
            default: return { icon: DollarSign, label: purpose, variant: 'secondary' as const };
        }
    }

    return (
        <div className="space-y-6">
             <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    Purchase Analytics
                </h1>
                <p className="text-muted-foreground">
                    An overview of revenue from registrations and purchases.
                </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Register Revenue</CardTitle>
                                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(registerAmount)}</div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Purchase Revenue</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(purchaseAmount)}</div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <Landmark className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Revenue Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-96 w-full">
                                <PurchasesPieChart data={pieChartData} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction History</CardTitle>
                             <CardDescription>
                                A log of all transactions within the selected date range.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-right">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchases.length > 0 ? purchases.map(p => {
                                        const { icon: Icon, label, variant } = getIconAndLabel(p.purpose);
                                        let details = '';
                                        switch(p.purpose) {
                                            case 'Purchase':
                                            case 'register':
                                                details = `Acquired ${p.attempts} attempts.`;
                                                break;
                                            case 'Agency to Student Transfer':
                                                details = `Transferred ${p.attempts} attempts to ${p.recipient?.full_name || 'a student'}.`;
                                                break;
                                            case 'Admin Recharge':
                                                details = `${p.attempts} attempts added by admin.`;
                                                break;
                                            default:
                                                details = `${p.attempts} attempts transaction.`
                                        }

                                        return (
                                            <TableRow key={p.id}>
                                                <TableCell>
                                                    {p.purchaser ? (
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-8 w-8 hidden md:flex">
                                                                <AvatarImage src={p.purchaser.avatar_url} />
                                                                <AvatarFallback>{p.purchaser.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="font-medium truncate max-w-[120px]">{p.purchaser.full_name}</div>
                                                                <div className="text-xs text-muted-foreground truncate max-w-[120px]">{p.purchaser.email}</div>
                                                            </div>
                                                        </div>
                                                    ) : <span className="text-muted-foreground italic">System</span>}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={variant}>
                                                        <Icon className="mr-1 h-3 w-3"/>
                                                        {label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">{details}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(p.amount_spent || 0)}</TableCell>
                                                <TableCell className="text-right text-muted-foreground text-xs">{p.formatted_date}</TableCell>
                                            </TableRow>
                                        )
                                    }) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No transactions in this period.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                         {totalPages > 1 && (
                            <CardFooter>
                                <PaginationControls currentPage={currentPage} totalPages={totalPages} />
                            </CardFooter>
                        )}
                    </Card>

                </div>
                <div className="lg:col-span-1">
                    <PurchasesControls />
                </div>
            </div>
        </div>
    );
}
