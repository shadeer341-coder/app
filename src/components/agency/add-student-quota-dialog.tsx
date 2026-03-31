
"use client";

import { useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Info } from 'lucide-react';
import { addQuotaToStudent } from '@/app/actions/agency';
import type { User } from '@/lib/types';

type AddStudentQuotaDialogProps = {
    studentId: string;
    agencyUser: User;
};

export function AddStudentQuotaDialog({ studentId, agencyUser }: AddStudentQuotaDialogProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [dialogOpen, setDialogOpen] = useState(false);

    const onSubmit = () => {
        startTransition(async () => {
            const result = await addQuotaToStudent(studentId, 3);
            if (result.success) {
                toast({ title: "Success", description: result.message });
                setDialogOpen(false);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message || "An unknown error occurred." });
            }
        });
    };

    const quotaAvailable = agencyUser.interview_quota ?? 0;
    const canAfford = quotaAvailable >= 3;

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" /> Add Quota</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Quota to Student</DialogTitle>
                    <DialogDescription>
                        Transfer attempts from your agency's balance to this student. You have {quotaAvailable} attempts available.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                    <div className="rounded-md bg-secondary/50 p-4 flex items-start gap-3">
                        <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">Standard Allocation</p>
                            <p className="text-sm text-muted-foreground">Student basic 3 attempts = 1 student</p>
                        </div>
                    </div>
                </div>

                <Button onClick={onSubmit} disabled={isPending || !canAfford} className="w-full">
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {canAfford ? 'Transfer 3 Attempts' : 'Insufficient Quota'}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
