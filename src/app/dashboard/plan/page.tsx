
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AgencyRechargeButton } from "@/components/agency/recharge-button";
import { Zap, Gem, Crown } from "lucide-react";

export default async function AgencyRechargePage() {
    const user = await getCurrentUser();
    if (!user || user.role !== 'agency') {
        redirect('/dashboard');
    }
    
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
