'use client';

import * as React from 'react';
import SalesManagement from '@/components/sales-management';
import { getSalesPaginated, getBooks, getCustomers } from '@/lib/actions';
import type { Sale, Book, Customer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


export default function SalesPage() {
  const [initialSales, setInitialSales] = React.useState<Sale[]>([]);
  const [initialHasMore, setInitialHasMore] = React.useState(false);
  const [initialBooks, setInitialBooks] = React.useState<Book[]>([]);
  const [initialCustomers, setInitialCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
        setIsLoading(true);
        const [salesResult, books, customers] = await Promise.all([
            getSalesPaginated({ pageLimit: 10 }),
            getBooks(),
            getCustomers(),
        ]);
        setInitialSales(salesResult.sales);
        setInitialHasMore(salesResult.hasMore);
        setInitialBooks(books);
        setInitialCustomers(customers);
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
    <SalesManagement
      initialSales={initialSales}
      initialHasMore={initialHasMore}
      initialBooks={initialBooks}
      initialCustomers={initialCustomers}
    />
  );
}
