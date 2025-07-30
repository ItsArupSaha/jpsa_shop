
'use client';

import CustomerManagement from '@/components/customer-management';
import { useAuth } from '@/hooks/use-auth';
import { Book } from 'lucide-react';

export default function CustomersPage() {
    const { user } = useAuth();
    if (!user) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
              <Book className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
    }
    return <CustomerManagement userId={user.uid} />;
}
