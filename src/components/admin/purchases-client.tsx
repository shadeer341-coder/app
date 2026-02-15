
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingBag, Landmark } from "lucide-react";
import { PurchasesControls } from "./purchases-controls";
import { PurchasesPieChart } from "./purchases-pie-chart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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
    error?: string;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export function PurchasesClient({ registerAmount = 0, purchaseAmount = 0, totalAmount = 0, pieChartData = [], error }: PurchasesClientProps) {

    if (error) {
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
                </div>
                <div className="lg:col-span-1">
                    <PurchasesControls />
                </div>
            </div>
        </div>
    );
}
