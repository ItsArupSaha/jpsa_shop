
'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { Book } from 'lucide-react';

export function AppWithAuthProvider({ children }: { children: React.ReactNode }) {
  const { authUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/onboarding';

    if (!authUser) {
      // If not logged in and not on login page, redirect to login
      if (pathname !== '/login') {
        router.replace('/login');
      }
    } else {
      // If logged in...
      if (!authUser.onboardingComplete) {
        // ...but onboarding is not complete, redirect to onboarding
        if (pathname !== '/onboarding') {
          router.replace('/onboarding');
        }
      } else {
        // ...and onboarding is complete, but they are on an auth page, redirect to dashboard
        if (isAuthPage) {
          router.replace('/dashboard');
        }
      }
    }
  }, [authUser, loading, router, pathname]);

  const showLoader = loading || (!authUser && pathname !== '/login') || (authUser && !authUser.onboardingComplete && pathname !== '/onboarding');

  if (showLoader) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Book className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return <>{children}</>;
}
