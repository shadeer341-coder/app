
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
import { Loader2, Plus } from 'lucide-react';
import { addQuotaToStudent } from '@/app/actions/agency';
import type { User } from '@/lib/types';


const addQuotaSchema = z.object({
  attempts: z.coerce.number().min(1, "You must add at least 1 attempt."),
});

type AddQuotaFormValues = z.infer<typeof addQuotaSchema>;

type AddStudentQuotaDialogProps = {
    studentId: string;
    agencyUser: User;
};

export function AddStudentQuotaDialog({ studentId, agencyUser }: AddStudentQuotaDialogProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [dialogOpen, setDialogOpen] = useState(false);

    const form = useForm<AddQuotaFormValues>({
        resolver: zodResolver(addQuotaSchema),
        defaultValues: {
            attempts: 1,
        },
    });

    const onSubmit = (data: AddQuotaFormValues) => {
        startTransition(async () => {
            const result = await addQuotaToStudent(studentId, data.attempts);
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
                <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Add Quota</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Quota to Student</DialogTitle>
                    <DialogDescription>
                        Transfer attempts from your agency's balance to this student. You have {agencyUser.interview_quota ?? 0} attempts available.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="attempts" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Attempts to Add</FormLabel>
                                <FormControl>
                                    <Input type="number" min="1" max={agencyUser.interview_quota ?? 0} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <Button type="submit" disabled={isPending} className="w-full">
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Transfer Attempts
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
