
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname, useRouter } from 'next/navigation';
import { Book } from 'lucide-react';

const publicRoutes = ['/login'];

export default function AppWithAuthProvider({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const isPublicRoute = publicRoutes.includes(pathname);

    React.useEffect(() => {
        if (!loading && !user && !isPublicRoute) {
            router.replace('/login');
        }
    }, [user, loading, isPublicRoute, router]);

    if (loading && !isPublicRoute) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Book className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user && !isPublicRoute) {
        // This will be caught by the useEffect, but adding it here prevents flashing of content
        return null;
    }

    return <>{children}</>;
}
