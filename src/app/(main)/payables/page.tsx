'use client';

import * as React from 'react';
import TransactionsManagement from '@/components/transactions-management';
import { getTransactionsPaginated } from '@/lib/actions';
import type { Transaction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function PayablesPage() {
  const [initialTransactions, setInitialTransactions] = React.useState<Transaction[]>([]);
  const [initialHasMore, setInitialHasMore] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const { transactions, hasMore } = await getTransactionsPaginated({ type: 'Payable', pageLimit: 15 });
      setInitialTransactions(transactions);
      setInitialHasMore(hasMore);
      setIsLoading(false);
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
        <div className="p-6">
            <Skeleton className="h-10 w-1/4 mb-4" />
            <Skeleton className="h-80 w-full" />
        </div>
    );
  }

  return (
    <TransactionsManagement
      title="Track Payables"
      description="Manage amounts the bookstore owes."
      type="Payable"
      initialTransactions={initialTransactions}
      initialHasMore={initialHasMore}
    />
  );
}
