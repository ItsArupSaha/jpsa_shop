
'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { Book } from 'lucide-react';

export default function Home() {
    const router = useRouter();

    React.useEffect(() => {
      router.replace('/dashboard');
    }, [router]);

    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Book className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
}
