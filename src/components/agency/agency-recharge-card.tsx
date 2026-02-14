
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { AgencyRechargeButton } from './recharge-button';
import { Users, Zap, Gem, Crown, ChevronDown } from 'lucide-react';

type Bundle = {
    name: string;
    attempts: number;
    price: string;
    icon: string;
    studentLimit: string;
};

const iconMap: { [key: string]: React.ElementType } = {
    Zap,
    Gem,
    Crown,
};

export function AgencyRechargeCard({ bundle }: { bundle: Bundle }) {
    const [showPayment, setShowPayment] = useState(false);
    const Icon = iconMap[bundle.icon];

    return (
        <Card key={bundle.name} className="flex flex-col">
            <CardHeader className="items-center text-center">
                <div className="p-4 bg-primary/10 rounded-full mb-2"><Icon className="w-8 h-8 text-primary" /></div>
                <CardTitle>{bundle.name}</CardTitle>
                <p className="text-4xl font-bold">{bundle.attempts}</p>
                <CardDescription>Interview Attempts</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 text-center space-y-4">
                <p className="text-3xl font-bold">${bundle.price}</p>
                 <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4"/>
                    <span>{bundle.studentLimit}</span>
                </div>
            </CardContent>
            <CardFooter className="flex-col items-stretch">
                 {showPayment ? (
                    <div className="w-full space-y-2">
                        <AgencyRechargeButton
                            attempts={bundle.attempts}
                            price={bundle.price}
                        />
                        <Button variant="ghost" className="w-full" onClick={() => setShowPayment(false)}>Cancel</Button>
                    </div>
                ) : (
                    <Button className="w-full" onClick={() => setShowPayment(true)}>
                        Payment Options
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
