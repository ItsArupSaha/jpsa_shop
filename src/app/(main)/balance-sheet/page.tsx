
'use client';

import BalanceSheet from '@/components/balance-sheet';
import { useAuth } from '@/hooks/use-auth';
import { Book } from 'lucide-react';

export default function BalanceSheetPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Book className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <BalanceSheet userId={user.uid} />;
}
