'use client';

import AuthorityPresentationReport from '@/components/authority-presentation-report';
import { useAuth } from '@/hooks/use-auth';
import { Book } from 'lucide-react';

export default function AuthorityPresentationPage() {
    const { user } = useAuth();
    if (!user) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Book className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    return <AuthorityPresentationReport userId={user.uid} />;
}
