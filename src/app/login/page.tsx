
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth.tsx';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Book, Loader2 } from 'lucide-react';
import jpsImage from '/public/jps_image.jpg';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.651-3.356-11.303-8H6.306C9.656,39.663,16.318,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.018,35.18,44,30.023,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
  );
}

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  React.useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);
  
  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed:", error);
    }
    // No need to set isSigningIn to false, as the useEffect will redirect
  };

  if (loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Book className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-24 w-24 relative overflow-hidden rounded-full">
            <Image 
              src={jpsImage}
              alt="JPS Archives Bangladesh"
              layout="fill"
              objectFit="cover"
              data-ai-hint="religious person"
              priority
            />
          </div>
          <CardTitle className="font-headline text-2xl">JPS Archives Bangladesh</CardTitle>
          <CardDescription>Please sign in to access the bookstore management system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignIn} disabled={isSigningIn} className="w-full">
            {isSigningIn ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="mr-2" />
            )}
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
