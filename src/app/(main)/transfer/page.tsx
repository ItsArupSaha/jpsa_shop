
'use client';

import CashBankTransfer from '@/components/cash-bank-transfer';
import { useAuth } from '@/hooks/use-auth';
import { Book } from 'lucide-react';

export default function TransferPage() {
    const { user } = useAuth();
    if (!user) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
              <Book className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
    }
  return <CashBankTransfer userId={user.uid} />;
}
