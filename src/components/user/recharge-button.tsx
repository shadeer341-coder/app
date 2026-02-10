
"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { rechargeUserQuota } from "@/app/actions/profile";
import { Loader2, ShoppingCart } from "lucide-react";

export function RechargeButton({ attempts }: { attempts: number }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleRecharge = () => {
        startTransition(async () => {
            const result = await rechargeUserQuota(attempts);
            if (result.success) {
                toast({
                    title: "Recharge Successful!",
                    description: `${attempts} attempts have been added to your account.`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Recharge Failed",
                    description: result.message,
                });
            }
        });
    };

    return (
        <Button onClick={handleRecharge} disabled={isPending} className="w-full">
            {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <ShoppingCart className="mr-2 h-4 w-4" />
            )}
            Purchase
        </Button>
    );
}
