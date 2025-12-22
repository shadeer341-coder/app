
"use client";

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { updateProfile } from '@/app/actions/profile';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import nationalities from '@/lib/nationalities.json';
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
  full_name: z.string().min(2, "Full name is required."),
  email: z.string().email(),
  gender: z.string().min(1, "Gender is required."),
  age: z.coerce.number().min(16, "You must be at least 16 years old.").max(100),
  nationality: z.string().min(1, "Nationality is required."),
  university: z.string(), // No validation needed as it's disabled
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileForm({ user }: { user: User }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user.name,
      email: user.email,
      gender: user.gender || '',
      age: user.age || undefined,
      nationality: user.nationality || '',
      university: user.university || '',
    },
  });

  function onSubmit(data: ProfileFormValues) {
    startTransition(async () => {
      // Exclude university from the data sent to the server action
      const { university, ...updateData } = data;
      const result = await updateProfile(updateData);
      if (result.success) {
        toast({
          title: "Profile Updated",
          description: "Your profile information has been saved.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: result.message,
        });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Your full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Your email" {...field} disabled />
              </FormControl>
               <p className="text-sm text-muted-foreground">You cannot change your email address.</p>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4 pt-2">
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
        </div>
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
         <FormField
          control={form.control}
          name="university"
          render={({ field }) => (
            <FormItem>
              <FormLabel>University</FormLabel>
              <FormControl>
                <Input placeholder="Your university" {...field} disabled />
              </FormControl>
              <p className="text-sm text-muted-foreground">University cannot be changed after onboarding.</p>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update profile
        </Button>
      </form>
    </Form>
  );
}
