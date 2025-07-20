'use client';

import * as React from 'react';
import PurchaseManagement from '@/components/purchase-management';
import { getPurchasesPaginated } from '@/lib/actions';
import type { Purchase } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function PurchasesPage() {
  const [initialPurchases, setInitialPurchases] = React.useState<Purchase[]>([]);
  const [initialHasMore, setInitialHasMore] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const { purchases, hasMore } = await getPurchasesPaginated({ pageLimit: 10 });
      setInitialPurchases(purchases);
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
  
  return <PurchaseManagement initialPurchases={initialPurchases} initialHasMore={initialHasMore} />;
}
