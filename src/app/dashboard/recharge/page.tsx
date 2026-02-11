
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { RechargeButton } from "@/components/user/recharge-button";

export const dynamic = 'force-dynamic';

export default async function RechargePage() {
    const user = await getCurrentUser();
    if (!user || user.role !== 'individual') {
        redirect('/dashboard');
    }

    const pack = { name: "Basic Pack", attempts: 3, price: "$25", icon: Zap };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">Recharge Quota</h1>
                <p className="text-muted-foreground">
                    You currently have <strong>{user.interview_quota ?? 0}</strong> attempts remaining. Purchase more below.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Purchase Interview Attempts</CardTitle>
                    <CardDescription>You can purchase a bundle of 3 attempts to continue practicing.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Card key={pack.name} className="flex flex-col w-full max-w-xs">
                        <CardHeader className="items-center text-center">
                            <div className="p-4 bg-primary/10 rounded-full mb-2"><pack.icon className="w-8 h-8 text-primary" /></div>
                            <CardTitle>{pack.name}</CardTitle>
                            <p className="text-4xl font-bold">{pack.attempts}</p>
                            <CardDescription>Interview Attempts</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 text-center">
                            <p className="text-3xl font-bold">{pack.price}</p>
                        </CardContent>
                        <CardFooter>
                            <RechargeButton attempts={pack.attempts} price={pack.price} />
                        </CardFooter>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );
}
