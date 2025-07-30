
'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { Book } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function Home() {
    const router = useRouter();
    const { user, loading } = useAuth();

    React.useEffect(() => {
      if (!loading) {
        if (user) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      }
    }, [router, user, loading]);

    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Book className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
}
