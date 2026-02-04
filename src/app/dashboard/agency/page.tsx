
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, FileText, BarChart, CreditCard, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function AgencyPage() {
    const user = await getCurrentUser();
    if (!user || user.role !== 'agency_admin') {
        redirect('/dashboard');
    }

    const navItems = [
        { href: "#interviews", label: "Recent Interviews", icon: FileText },
        { href: "#usage", label: "Usage", icon: BarChart },
        { href: "#plan", label: "Plan", icon: CreditCard },
        { href: "#recharge", label: "Recharge", icon: ShoppingCart },
    ];

    const plans = [
        {
            name: "Starter",
            description: "For up to 10 students.",
            features: ["Up to 10 students", "Basic analytics"],
            price: "$49/mo"
        },
        {
            name: "Standard",
            description: "For up to 25 students.",
            features: ["Up to 25 students", "Advanced analytics", "Custom branding"],
            price: "$99/mo"
        },
        {
            name: "Advanced",
            description: "For up to 50 students.",
            features: ["Up to 50 students", "Full analytics suite", "Custom branding", "Priority support"],
            price: "$199/mo"
        }
    ];

    const currentPlanName = user.agency_tier || 'Starter';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    Agency Management
                </h1>
                <p className="text-muted-foreground">
                    Manage your members, plan, and billing.
                </p>
            </div>
            <div className="grid md:grid-cols-[220px_1fr] lg:grid-cols-[250px_1fr] gap-10">
                <aside className="hidden md:block">
                    <nav className="flex flex-col gap-1 sticky top-24">
                        {navItems.map(item => (
                             <Button asChild key={item.href} variant="ghost" className="justify-start">
                                <Link href={item.href}>
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.label}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>
                <main className="space-y-12">
                    <section id="interviews">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Interviews</CardTitle>
                                <CardDescription>
                                    Latest interview sessions from your members.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-center h-40 rounded-lg bg-muted/50">
                                    <p className="text-sm text-muted-foreground">Coming soon...</p>
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                    
                    <section id="usage">
                        <Card>
                            <CardHeader>
                                <CardTitle>Usage</CardTitle>
                                <CardDescription>
                                    Overview of your agency's interview quota usage.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-center h-40 rounded-lg bg-muted/50">
                                    <p className="text-sm text-muted-foreground">Coming soon...</p>
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                    
                    <section id="plan">
                        <Card>
                            <CardHeader>
                                <CardTitle>Your Plan</CardTitle>
                                <CardDescription>
                                    You are currently on the <strong>{currentPlanName}</strong> plan. Manage or upgrade your plan below.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {plans.map(plan => {
                                    const isCurrentPlan = plan.name.toLowerCase() === currentPlanName.toLowerCase();
                                    return (
                                        <Card key={plan.name} className={cn("flex flex-col", isCurrentPlan ? "border-primary ring-2 ring-primary" : "")}>
                                            <CardHeader>
                                                <CardTitle>{plan.name}</CardTitle>
                                                <p className="text-3xl font-bold">{plan.price}</p>
                                                <CardDescription>{plan.description}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4 flex-1">
                                                <ul className="space-y-2">
                                                    {plan.features.map(feature => (
                                                        <li key={feature} className="flex items-start gap-2 text-sm">
                                                            <CheckCircle className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                                                            <span>{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                            <CardFooter>
                                                {isCurrentPlan ? (
                                                    <Button disabled className="w-full">Current Plan</Button>
                                                ) : (
                                                    <Button variant="outline" className="w-full">Upgrade</Button>
                                                )}
                                            </CardFooter>
                                        </Card>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    </section>
                    
                    <section id="recharge">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Zap /> Recharge</CardTitle>
                                <CardDescription>
                                    Purchase more interview attempts for your agency.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-center h-40 rounded-lg bg-muted/50">
                                    <p className="text-sm text-muted-foreground">Coming soon...</p>
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                </main>
            </div>
        </div>
    );
}
