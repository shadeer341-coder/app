
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Zap, Gem, Crown } from "lucide-react";
import { RechargeButton } from "@/components/user/recharge-button";
import { AgencyRechargeButton } from "@/components/agency/recharge-button";

export const dynamic = 'force-dynamic';

export default async function RechargePage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect('/');
    }

    if (user.role === 'individual') {
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

    if (user.role === 'agency') {
        const bundles = [
            {
                name: "Starter Bundle",
                attempts: 10,
                price: "240",
                icon: Zap
            },
            {
                name: "Standard Bundle",
                attempts: 25,
                price: "575",
                icon: Gem,
            },
            {
                name: "Advanced Bundle",
                attempts: 50,
                price: "1100",
                icon: Crown,
            }
        ];

        return (
            <div className="space-y-6">
                <div>
                    <h1 className="font-headline text-3xl font-bold tracking-tight">
                        Recharge Quota
                    </h1>
                    <p className="text-muted-foreground">
                       You currently have <strong>{user.interview_quota ?? 0}</strong> attempts. Purchase a bundle to add more to your agency's balance.
                    </p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Purchase Attempt Bundles</CardTitle>
                         <CardDescription>
                            Select any bundle to add attempts to your agency's quota.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bundles.map(bundle => {
                            return (
                                <Card key={bundle.name} className="flex flex-col">
                                    <CardHeader className="items-center text-center">
                                        <div className="p-4 bg-primary/10 rounded-full mb-2"><bundle.icon className="w-8 h-8 text-primary" /></div>
                                        <CardTitle>{bundle.name}</CardTitle>
                                        <p className="text-4xl font-bold">{bundle.attempts}</p>
                                        <CardDescription>Interview Attempts</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 text-center">
                                        <p className="text-3xl font-bold">${bundle.price}</p>
                                    </CardContent>
                                    <CardFooter>
                                         <AgencyRechargeButton 
                                            attempts={bundle.attempts} 
                                            price={bundle.price} 
                                        />
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    // Admins and other roles get redirected
    redirect('/dashboard');
}
