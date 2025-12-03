"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/icons';

const steps = [
  { id: 1, title: 'Personal Information' },
  { id: 2, title: 'Academic Background' },
  { id: 3, title: 'Review and Confirm' },
];

const formSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  gender: z.string().min(1, "Gender is required."),
  age: z.coerce.number().min(16, "You must be at least 16 years old.").max(100),
  nationality: z.string().min(2, "Nationality is required."),
  program: z.string().min(1, "Program choice is required."),
  university: z.string().min(2, "University is required."),
  lastEducation: z.string().min(1, "Last completed education is required."),
});

type FormData = z.infer<typeof formSchema>;

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createSupabaseClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      gender: '',
      age: undefined,
      nationality: '',
      program: '',
      university: '',
      lastEducation: '',
    },
  });

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find user. Please log in again.' });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: data.fullName,
        gender: data.gender,
        age: data.age,
        nationality: data.nationality,
        program: data.program,
        university: data.university,
        last_education: data.lastEducation,
        onboarding_completed: true,
      },
    });

    setLoading(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
    } else {
      toast({ title: 'Onboarding Complete!', description: 'Welcome to your dashboard.' });
      router.push('/dashboard');
      router.refresh(); // Force a refresh to re-evaluate dashboard layout
    }
  };

  const progressValue = (currentStep / steps.length) * 100;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
        <Link href="/" className="flex items-center justify-center gap-2 font-headline text-2xl font-bold mb-6">
            <Logo className="h-10 w-10 text-primary" />
            <span className="text-3xl">precasprep</span>
        </Link>
        <Card className="w-full max-w-2xl">
            <CardHeader>
            <CardTitle className="text-2xl font-headline">Welcome! Let's get you set up.</CardTitle>
            <CardDescription>Please complete the following steps to personalize your experience.</CardDescription>
             <Progress value={progressValue} className="mt-4" />
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {currentStep === 1 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Step 1: Personal Information</h3>
                        <FormField control={form.control} name="fullName" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl><Input placeholder="e.g., Alex Johnson" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Gender</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="male" /></FormControl><FormLabel className="font-normal">Male</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="female" /></FormControl><FormLabel className="font-normal">Female</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="other" /></FormControl><FormLabel className="font-normal">Other</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="age" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Age</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g., 21" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="nationality" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nationality</FormLabel>
                            <FormControl><Input placeholder="e.g., British" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                )}
                {currentStep === 2 && (
                    <div className="space-y-4">
                         <h3 className="text-lg font-medium">Step 2: Academic Background</h3>
                         <FormField control={form.control} name="program" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Program You Are Applying For</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a program" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="foundation_degree">Foundation + Degree</SelectItem>
                                        <SelectItem value="degree">Degree (Undergraduate)</SelectItem>
                                        <SelectItem value="top_up">Top-Up / Final Year</SelectItem>
                                        <SelectItem value="masters">Masters (Postgraduate)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="university" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Which University Are You Applying To?</FormLabel>
                            <FormControl><Input placeholder="e.g., University of London" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="lastEducation" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Last Completed Education</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select your last education level" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="high_school">High School / O-Level</SelectItem>
                                        <SelectItem value="a_level">A-Level</SelectItem>
                                        <SelectItem value="foundation">University Foundation</SelectItem>
                                        <SelectItem value="hnd">Higher National Diploma</SelectItem>
                                        <SelectItem value="bachelor">Bachelor Degree</SelectItem>
                                        <SelectItem value="master">Master’s Degree</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                )}
                {currentStep === 3 && (
                     <div className="space-y-6">
                        <h3 className="text-lg font-medium">Step 3: Review and Confirm</h3>
                        <div className="space-y-2 rounded-md border p-4">
                           <h4 className="font-medium">Personal Information</h4>
                            <p><strong>Full Name:</strong> {form.getValues().fullName}</p>
                            <p><strong>Gender:</strong> {form.getValues().gender}</p>
                            <p><strong>Age:</strong> {form.getValues().age}</p>
                            <p><strong>Nationality:</strong> {form.getValues().nationality}</p>
                        </div>
                         <div className="space-y-2 rounded-md border p-4">
                           <h4 className="font-medium">Academic Background</h4>
                            <p><strong>Applying for:</strong> {form.getValues().program}</p>
                            <p><strong>University:</strong> {form.getValues().university}</p>
                            <p><strong>Last Education:</strong> {form.getValues().lastEducation}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">Please review your information. By clicking "Submit," you confirm that the details are correct.</p>
                    </div>
                )}

                <div className="flex justify-between">
                    {currentStep > 1 && (
                        <Button type="button" variant="outline" onClick={prevStep}>Back</Button>
                    )}
                    {currentStep < steps.length && (
                        <Button type="button" onClick={nextStep} className="ml-auto">Next</Button>
                    )}
                    {currentStep === steps.length && (
                        <Button type="submit" className="ml-auto" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit
                        </Button>
                    )}
                </div>
                </form>
            </Form>
            </CardContent>
        </Card>
    </div>
  );
}
