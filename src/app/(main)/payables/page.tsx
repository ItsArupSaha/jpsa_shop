
'use client';
import TransactionsManagement from '@/components/transactions-management';
import { useAuth } from '@/hooks/use-auth';
import { Book } from 'lucide-react';

export default function PayablesPage() {
    const { user } = useAuth();
    if (!user) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
              <Book className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
    }
  return (
    <TransactionsManagement
      title="Track Payables"
      description="Manage amounts the bookstore owes."
      type="Payable"
      userId={user.uid}
    />
  );
}
