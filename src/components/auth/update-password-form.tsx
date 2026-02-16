'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const updatePasswordSchema = z.object({
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
});

type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

export function UpdatePasswordForm() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('Invalid or expired password reset link.');

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: '' },
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            setStatus('ready');
        } else if (event === 'SIGNED_IN') {
            // If user is already signed in normally, they can't be in recovery mode
            setStatus('error');
            setErrorMessage('You are already signed in. You cannot reset a password while logged in.');
        }
    });

    // A small delay to see if the PASSWORD_RECOVERY event fires. If not, it's an invalid link.
    const timer = setTimeout(() => {
        if (status === 'loading') {
            setStatus('error');
        }
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [supabase, status]);

  const onSubmit = (data: UpdatePasswordFormValues) => {
    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
        setStatus('error');
        setErrorMessage(error.message);
      } else {
        toast({
          title: 'Success!',
          description: 'Your password has been reset. You can now log in.',
        });
        setStatus('success');
        await supabase.auth.signOut(); // Sign out of the recovery session
        router.push('/'); // Redirect to login
      }
    });
  };
  
  if (status === 'loading') {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (status === 'error') {
    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Password Reset Failed</AlertTitle>
            <AlertDescription>
                {errorMessage}
                <Button asChild variant="link" className="p-0 h-auto mt-2">
                    <Link href="/">Return to Login</Link>
                </Button>
            </AlertDescription>
        </Alert>
    );
  }
  
   if (status === 'success') {
    return (
        <Alert variant="default" className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Password Reset Successfully</AlertTitle>
            <AlertDescription>
                You are being redirected to the login page.
            </AlertDescription>
        </Alert>
    );
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter your new password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Set New Password
        </Button>
      </form>
    </Form>
  );
}