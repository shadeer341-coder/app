
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSupabaseClient } from '@/lib/supabase/client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { requestPasswordReset } from '@/app/actions/auth';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const forgotPasswordSchema = z.object({
    email: z.string().email({ message: 'Please enter a valid email.' }),
});

export function LoginPageClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'forgot-password' | 'email-sent'>('login');
  const supabase = createSupabaseClient();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  
  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    setLoading(false);
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message,
      });
    } else {
      router.refresh();
    }
  }
  
  async function onForgotPasswordSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setLoading(true);
    const result = await requestPasswordReset(values.email);
    setLoading(false);
    if (!result.success) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message,
        });
    } else {
        setView('email-sent');
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
       <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-1/2 left-1/2 w-full h-full min-w-full min-h-full object-cover transform -translate-x-1/2 -translate-y-1/2"
      >
        <source src="/login.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[#ffffff1f]" />
      <Card className="relative mx-auto max-w-sm w-full bg-card/90 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center pt-8">
            <Link href="/" className="flex justify-center mb-2 mt-4">
                <Image src="/precasprep-logo.webp" alt="Precasprep Logo" width={180} height={40} style={{ objectFit: 'contain' }} />
            </Link>
            {view === 'login' && (
                <CardTitle className="text-2xl font-headline">Login</CardTitle>
            )}
            {view === 'forgot-password' && (
                <>
                    <CardTitle className="text-2xl font-headline">Forgot Password</CardTitle>
                    <CardDescription>
                        Enter your email and we&apos;ll send a reset link.
                    </CardDescription>
                </>
            )}
            {view === 'email-sent' && (
                <>
                    <CardTitle className="text-2xl font-headline">Check your email</CardTitle>
                    <CardDescription>
                        A password reset link has been sent. It might be in your spam folder.
                    </CardDescription>
                </>
            )}
        </CardHeader>
        <CardContent>
            {view === 'login' && (
                <>
                    <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="grid gap-4">
                        <FormField
                            control={loginForm.control}
                            name="email"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                <Input placeholder="m@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={loginForm.control}
                            name="password"
                            render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    <button
                                        type="button"
                                        onClick={() => setView('forgot-password')}
                                        className="ml-auto inline-block text-sm underline"
                                    >
                                        Forgot your password?
                                    </button>
                                </div>
                                <FormControl>
                                <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Login
                        </Button>
                        </form>
                    </Form>
                    <div className="mt-4 text-center text-sm">
                        Don&apos;t have an account?{" "}
                        <Link href="https://www.precasprep.com/#pricing" className="underline">
                        Sign up
                        </Link>
                    </div>
                </>
            )}
            {view === 'forgot-password' && (
                <>
                    <Form {...forgotPasswordForm}>
                        <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="grid gap-4">
                            <FormField
                                control={forgotPasswordForm.control}
                                name="email"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                    <Input placeholder="m@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Reset Link
                            </Button>
                        </form>
                    </Form>
                     <div className="mt-4 text-center text-sm">
                        <button onClick={() => setView('login')} className="underline">
                            Back to login
                        </button>
                    </div>
                </>
            )}
            {view === 'email-sent' && (
                 <Button onClick={() => setView('login')} className="w-full">
                    Back to login
                </Button>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
