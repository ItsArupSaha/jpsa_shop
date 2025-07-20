'use client';

import * as React from 'react';
import ExpensesManagement from '@/components/expenses-management';
import { getExpensesPaginated } from '@/lib/actions';
import type { Expense } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExpensesPage() {
  const [initialExpenses, setInitialExpenses] = React.useState<Expense[]>([]);
  const [initialHasMore, setInitialHasMore] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const { expenses, hasMore } = await getExpensesPaginated({ pageLimit: 10 });
      setInitialExpenses(expenses);
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

  return <ExpensesManagement initialExpenses={initialExpenses} initialHasMore={initialHasMore} />;
}
