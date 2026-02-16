import { Suspense } from 'react';
import { UpdatePasswordForm } from '@/components/auth/update-password-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

function UpdatePasswordPage() {
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
        <CardHeader className="space-y-1 text-center">
          <Link href="/" className="flex justify-center mb-4 mt-8">
            <Image src="/precasprep-logo.webp" alt="Precasprep Logo" width={180} height={40} style={{ objectFit: 'contain' }} />
          </Link>
          <CardTitle className="text-2xl font-headline">Reset Your Password</CardTitle>
          <CardDescription>Enter a new password for your account below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <UpdatePasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
export default UpdatePasswordPage;
