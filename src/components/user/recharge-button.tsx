
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { rechargeUserQuota } from "@/app/actions/profile";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import type { OnApproveData, CreateOrderData } from "@paypal/paypal-js";
import { Loader2 } from "lucide-react";

export function RechargeButton({ attempts, price }: { attempts: number, price: string }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

    if (!paypalClientId) {
        return <p className="text-sm text-destructive p-4 text-center">PayPal Client ID is not configured by the administrator.</p>;
    }
    
    const numericPrice = price.replace('$', '');

    const createOrder = (data: CreateOrderData, actions: any) => {
        return actions.order.create({
            purchase_units: [
                {
                    description: `${attempts} Interview Attempts`,
                    amount: {
                        value: numericPrice,
                        currency_code: "USD",
                    },
                },
            ],
            application_context: {
                shipping_preference: 'NO_SHIPPING',
            }
        });
    };

    const onApprove = async (data: OnApproveData, actions: any) => {
        setIsProcessing(true);
        try {
            const details = await actions.order.capture();
            if (details.status !== 'COMPLETED') {
                throw new Error('Payment was not completed.');
            }
            
            const numericPriceValue = parseFloat(numericPrice);
            const result = await rechargeUserQuota(attempts, numericPriceValue);
            if (result.success) {
                toast({
                    title: "Recharge Successful!",
                    description: `${attempts} attempts have been added to your account.`,
                });
                router.refresh();
            } else {
                throw new Error(result.message);
            }
        } catch (err: any) {
            console.error("PayPal onApprove error:", err);
            setError("Something went wrong with your payment. Please try again.");
            toast({
                variant: "destructive",
                title: "Recharge Failed",
                description: err.message || "An unknown error occurred.",
            });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const onError = (err: any) => {
        console.error("PayPal Button error:", err);
        setError("There was an error with the PayPal button. Please refresh the page and try again.");
         toast({
            variant: "destructive",
            title: "Payment Error",
            description: "Could not initialize the payment gateway.",
        });
    };
    
    if (error) {
        return <p className="text-sm text-destructive p-4 text-center">{error}</p>;
    }

    return (
        <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD", intent: "capture" }}>
            {isProcessing && (
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm h-24">
                    <Loader2 className="w-8 h-8 animate-spin"/>
                    <span>Processing payment...</span>
                </div>
            )}
            <div className={isProcessing ? 'hidden' : 'w-full'}>
                <PayPalButtons
                    style={{ layout: "vertical", label: "pay" }}
                    createOrder={createOrder}
                    onApprove={onApprove}
                    onError={onError}
                    disabled={isProcessing}
                />
            </div>
        </PayPalScriptProvider>
    );
}
