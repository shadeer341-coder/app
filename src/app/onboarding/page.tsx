
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type FieldName } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/icons';
import nationalities from '@/lib/nationalities.json';
import universities from '@/lib/universities.json';

const formSchema = z.object({
  full_name: z.string().min(2, "Full name is required."),
  gender: z.string().min(1, "Gender is required."),
  age: z.coerce.number().min(16, "You must be at least 16 years old.").max(100),
  nationality: z.string().min(1, "Nationality is required."),
  program: z.string().min(1, "Program choice is required."),
  university: z.string().min(2, "University is required."),
  last_education: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const stepFields: Record<number, FieldName<FormData>[]> = {
    1: ['full_name', 'gender', 'age', 'nationality'],
    2: ['program', 'university'],
    3: [] // No validation for optional step 3
};


export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createSupabaseClient();
  const totalSteps = 4;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      gender: '',
      age: undefined,
      nationality: '',
      program: '',
      university: '',
      last_education: '',
    },
  });

  const nextStep = async () => {
    const fieldsToValidate = stepFields[currentStep];
    if (fieldsToValidate && fieldsToValidate.length > 0) {
        const isValid = await form.trigger(fieldsToValidate);
        if (!isValid) {
            return;
        }
    }
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find user. Please log in again.' });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ ...data, onboarding_completed: true })
      .eq('id', user.id);

    setLoading(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
    } else {
      toast({ title: 'Onboarding Complete!', description: 'Welcome to your dashboard.' });
      router.push('/dashboard');
      router.refresh(); // Force a refresh to re-evaluate dashboard layout
    }
  };

  const progressValue = (currentStep / totalSteps) * 100;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl">
        <div className="mb-8 px-4">
            <div className="flex justify-between items-center mb-2">
                {currentStep > 1 ? (
                     <Button variant="ghost" size="icon" onClick={prevStep}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                ) : <div className="w-10 h-10"></div>}
                
                <Link href="/" className="flex items-center justify-center gap-2 font-headline text-2xl font-bold">
                    <Logo className="h-8 w-8 text-primary" />
                    <span className="text-2xl hidden sm:inline">precasprep</span>
                </Link>

                <div className="w-10 h-10"></div>
            </div>
            <Progress value={progressValue} />
        </div>

        <main>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="text-center mb-8">
                    <p className="text-primary font-semibold mb-2">STEP {currentStep} / {totalSteps}</p>
                    {currentStep === 1 && <h1 className="font-headline text-3xl md:text-4xl font-bold">First, tell us about yourself.</h1>}
                    {currentStep === 2 && <h1 className="font-headline text-3xl md:text-4xl font-bold">What are your academic goals?</h1>}
                    {currentStep === 3 && <h1 className="font-headline text-3xl md:text-4xl font-bold">What's your educational background?</h1>}
                    {currentStep === 4 && <h1 className="font-headline text-3xl md:text-4xl font-bold">Please review and confirm.</h1>}
                </div>

                <div className="max-w-xl mx-auto">
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <FormField control={form.control} name="full_name" render={({ field }) => (
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a nationality" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {nationalities.map((nat) => (
                                                    <SelectItem key={nat.value} value={nat.value}>
                                                        {nat.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                    )}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <FormField control={form.control} name="program" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Program You Are Applying For</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a program" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Foundation + Degree">Foundation + Degree</SelectItem>
                                            <SelectItem value="Degree (Undergraduate)">Degree (Undergraduate)</SelectItem>
                                            <SelectItem value="Top-Up / Final Year">Top-Up / Final Year</SelectItem>
                                            <SelectItem value="Masters (Postgraduate)">Masters (Postgraduate)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="university" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Which University Are You Applying To?</FormLabel>
                                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a university" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {universities.map((uni) => (
                                                <SelectItem key={uni.value} value={uni.value}>
                                                    {uni.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    )}
                    {currentStep === 3 && (
                         <div className="space-y-4">
                            <FormField control={form.control} name="last_education" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Last Completed Education</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select your last education level" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="High School / O-Level">High School / O-Level</SelectItem>
                                            <SelectItem value="A-Level">A-Level</SelectItem>
                                            <SelectItem value="University Foundation">University Foundation</SelectItem>
                                            <SelectItem value="Higher National Diploma">Higher National Diploma</SelectItem>
                                            <SelectItem value="Bachelor Degree">Bachelor Degree</SelectItem>
                                            <SelectItem value="Master’s Degree">Master’s Degree</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <p className="text-sm text-muted-foreground text-center pt-2">This step is optional. You can proceed without making a selection.</p>
                        </div>
                    )}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <div className="space-y-2 rounded-md border p-4 bg-secondary/50">
                                <h4 className="font-medium text-lg">Personal Information</h4>
                                <p><strong>Full Name:</strong> {form.getValues().full_name}</p>
                                <p><strong>Gender:</strong> {form.getValues().gender}</p>
                                <p><strong>Age:</strong> {form.getValues().age}</p>
                                <p><strong>Nationality:</strong> {form.getValues().nationality}</p>
                            </div>
                            <div className="space-y-2 rounded-md border p-4 bg-secondary/50">
                                <h4 className="font-medium text-lg">Academic Goals</h4>
                                <p><strong>Applying for:</strong> {form.getValues().program}</p>
                                <p><strong>University:</strong> {form.getValues().university}</p>
                            </div>
                            <div className="space-y-2 rounded-md border p-4 bg-secondary/50">
                                <h4 className="font-medium text-lg">Educational Background</h4>
                                <p><strong>Last Education:</strong> {form.getValues().last_education || 'Not provided'}</p>
                            </div>
                            <p className="text-sm text-muted-foreground text-center">Please review your information. By clicking "Submit," you confirm that the details are correct.</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-center pt-8">
                    {currentStep < totalSteps && (
                        <Button type="button" size="lg" onClick={nextStep}>Next</Button>
                    )}
                    {currentStep === totalSteps && (
                        <Button type="submit" size="lg" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit & Go to Dashboard
                        </Button>
                    )}
                </div>
            </form>
          </Form>
        </main>
      </div>
    </div>
  );
}
