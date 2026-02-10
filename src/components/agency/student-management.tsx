
"use client";

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { User } from '@/lib/types';
import { createStudentByAgency } from '@/app/actions/agency';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, EyeOff, Eye, ArrowRight } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';


const createStudentSchema = z.object({
  full_name: z.string().min(2, "Full name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

type CreateStudentFormValues = z.infer<typeof createStudentSchema>;


export function StudentManagement({ students }: { students: User[] }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<CreateStudentFormValues>({
        resolver: zodResolver(createStudentSchema),
        defaultValues: {
            full_name: '',
            email: '',
            password: '',
        },
    });

    const onSubmit = (data: CreateStudentFormValues) => {
        const formData = new FormData();
        for (const key in data) {
            const value = data[key as keyof typeof data];
            if (value) {
                formData.append(key, String(value));
            }
        }

        startTransition(async () => {
            const result = await createStudentByAgency(formData);
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
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>All Students</CardTitle>
                    <CardDescription>
                        A list of all students registered under your agency.
                    </CardDescription>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Student</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Create New Student Account</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField control={form.control} name="full_name" render={({ field }) => (
                                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Alex Johnson" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="student@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                 <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Temporary Password</FormLabel>
                                        <div className="relative">
                                            <FormControl>
                                                <Input type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" {...field} />
                                            </FormControl>
                                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                
                                <Button type="submit" disabled={isPending} className="w-full">
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Student
                                </Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Program</TableHead>
                            <TableHead>Interview Quota</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.length > 0 ? students.map(student => (
                            <TableRow key={student.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={student.avatarUrl} alt={student.name} />
                                            <AvatarFallback>{student.name?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="font-medium">{student.name}</div>
                                    </div>
                                </TableCell>
                                <TableCell>{student.email}</TableCell>
                                <TableCell>{student.program || 'N/A'}</TableCell>
                                <TableCell>{student.status === 'active' ? student.interview_quota ?? 0 : 'N/A'}</TableCell>
                                 <TableCell>
                                    <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                                        {student.status === 'active' ? 'Active' : 'Pending Onboarding'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/dashboard/students/${student.id}`}>
                                            View <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    You haven't added any students yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
