
"use client";

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Repeat } from 'lucide-react';
import { rechargeUserQuotaByAdmin } from '@/app/actions/admin';
import type { User } from '@/lib/types';


const rechargeSchema = z.object({
  attempts: z.coerce.number().min(1, "You must add at least 1 attempt."),
});

type RechargeFormValues = z.infer<typeof rechargeSchema>;

type RechargeUserDialogProps = {
    user: User;
};

export function RechargeUserDialog({ user }: RechargeUserDialogProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [dialogOpen, setDialogOpen] = useState(false);

    const form = useForm<RechargeFormValues>({
        resolver: zodResolver(rechargeSchema),
        defaultValues: {
            attempts: 10,
        },
    });

    const onSubmit = (data: RechargeFormValues) => {
        startTransition(async () => {
            const result = await rechargeUserQuotaByAdmin(user.id, data.attempts);
            if (result.success) {
                toast({ title: "Success", description: result.message });
                setDialogOpen(false);
                form.reset();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message || "An unknown error occurred." });
            }
        });
    };

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <Repeat className="h-4 w-4" />
                    <span className="sr-only">Recharge</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Recharge Quota for {user.name}</DialogTitle>
                    <DialogDescription>
                        Current quota: {user.interview_quota ?? 0}. Add more attempts below.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="attempts" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Attempts to Add</FormLabel>
                                <FormControl>
                                    <Input type="number" min="1" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <Button type="submit" disabled={isPending} className="w-full">
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Attempts
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
