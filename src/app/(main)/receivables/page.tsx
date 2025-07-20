'use client';

import * as React from 'react';
import ReceivablesManagement from '@/components/receivables-management';
import { getCustomersWithDueBalancePaginated } from '@/lib/actions';
import type { CustomerWithDue } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


export default function ReceivablesPage() {
  const [initialCustomers, setInitialCustomers] = React.useState<CustomerWithDue[]>([]);
  const [initialHasMore, setInitialHasMore] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const { customersWithDue, hasMore } = await getCustomersWithDueBalancePaginated({ pageLimit: 15 });
      setInitialCustomers(customersWithDue);
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

  return <ReceivablesManagement initialCustomersWithDue={initialCustomers} initialHasMore={initialHasMore} />;
}
