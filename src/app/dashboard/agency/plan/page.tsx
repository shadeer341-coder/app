
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function AgencyPlanPage() {
    const user = await getCurrentUser();
    if (!user || user.role !== 'agency') {
        redirect('/dashboard');
    }
    
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
                    Manage Your Plan
                </h1>
                <p className="text-muted-foreground">
                   You are currently on the <strong>{currentPlanName}</strong> plan. Manage or upgrade your plan below.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Available Plans</CardTitle>
                     <CardDescription>
                        Choose the plan that best fits your agency's needs.
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
        </div>
    );
}
