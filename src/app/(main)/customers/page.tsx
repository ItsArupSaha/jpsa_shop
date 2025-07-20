'use client';

import * as React from 'react';
import CustomerManagement from '@/components/customer-management';
import { getCustomersPaginated } from '@/lib/actions';
import type { Customer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


export default function CustomersPage() {
  const [initialCustomers, setInitialCustomers] = React.useState<Customer[]>([]);
  const [initialHasMore, setInitialHasMore] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const { customers, hasMore } = await getCustomersPaginated({ pageLimit: 15 });
      setInitialCustomers(customers);
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

  return <CustomerManagement initialCustomers={initialCustomers} initialHasMore={initialHasMore} />;
}
