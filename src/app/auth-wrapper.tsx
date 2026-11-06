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

    const isManagementRoute = pathname.startsWith('/management');
    const isAuthPage = pathname === '/login' || pathname === '/onboarding';

    if (isManagementRoute) {
      if (!authUser) {
        // Strict guard: unauthenticated access to /management is immediately redirected to /login
        router.replace('/login');
      } else if (!authUser.onboardingComplete && pathname !== '/onboarding') {
        router.replace('/onboarding');
      }
    } else if (isAuthPage) {
      if (authUser && authUser.onboardingComplete) {
        router.replace('/management/dashboard');
      }
    }
  }, [authUser, loading, router, pathname]);

  const isManagementRoute = pathname.startsWith('/management');
  const isAuthPage = pathname === '/login' || pathname === '/onboarding';

  // Strict loading shield for /management routes
  const showLoader = isManagementRoute && (loading || !authUser || !authUser.onboardingComplete);

  if (showLoader) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Book className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return <>{children}</>;
}
