
'use client';

import { useAuth } from '@/hooks/use-auth.tsx';
import { useRouter } from 'next/navigation';
import React from 'react';
import { Book } from 'lucide-react';

export default function Home() {
    const { user, loading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!loading) {
            if (user) {
                router.replace('/dashboard');
            } else {
                router.replace('/login');
            }
        }
    }, [user, loading, router]);

    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Book className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
}
