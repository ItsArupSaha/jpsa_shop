
'use client';
import ExpensesManagement from '@/components/expenses-management';
import { useAuth } from '@/hooks/use-auth';
import { Book } from 'lucide-react';

export default function ExpensesPage() {
    const { user } = useAuth();
    if (!user) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
              <Book className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
    }
  return <ExpensesManagement userId={user.uid} />;
}
