
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Zap, Sparkles, Gem } from "lucide-react";
import { RechargeButton } from "@/components/user/recharge-button";

export const dynamic = 'force-dynamic';

export default async function RechargePage() {
    const user = await getCurrentUser();
    // This page is for individual users not associated with an agency.
    // Agencies, their students, and Admins are also redirected.
    if (!user || user.role !== 'user' || user.agencyId) {
        redirect('/dashboard');
    }

    const rechargePacks = [
        {
            name: "Small Pack",
            attempts: 10,
            price: "$10",
            icon: Zap
        },
        {
            name: "Medium Pack",
            attempts: 25,
            price: "$22",
            description: "Save 12%",
            icon: Sparkles
        },
        {
            name: "Large Pack",
            attempts: 50,
            price: "$40",
            description: "Save 20%",
            icon: Gem
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    Recharge Quota
                </h1>
                <p className="text-muted-foreground">
                    You currently have <strong>{user.interview_quota ?? 0}</strong> attempts remaining. Purchase more below.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Purchase Interview Attempts</CardTitle>
                    <CardDescription>
                        Select a package to add more interview attempts to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rechargePacks.map(pack => {
                        const Icon = pack.icon;
                        return (
                            <Card key={pack.name} className="flex flex-col">
                                <CardHeader className="items-center text-center">
                                    <div className="p-4 bg-primary/10 rounded-full mb-2">
                                        <Icon className="w-8 h-8 text-primary" />
                                    </div>
                                    <CardTitle>{pack.name}</CardTitle>
                                    <p className="text-4xl font-bold">{pack.attempts}</p>
                                    <CardDescription>Interview Attempts</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 text-center">
                                    <p className="text-3xl font-bold">{pack.price}</p>
                                    {pack.description && <p className="text-sm text-green-600 font-medium">{pack.description}</p>}
                                </CardContent>
                                <CardFooter>
                                    <RechargeButton attempts={pack.attempts} />
                                </CardFooter>
                            </Card>
                        )
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
