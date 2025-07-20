'use client';

import * as React from 'react';
import DonationsManagement from '@/components/donations-management';
import { getDonationsPaginated } from '@/lib/actions';
import type { Donation } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function DonationsPage() {
  const [initialDonations, setInitialDonations] = React.useState<Donation[]>([]);
  const [initialHasMore, setInitialHasMore] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
        setIsLoading(true);
        const { donations, hasMore } = await getDonationsPaginated({ pageLimit: 10 });
        setInitialDonations(donations);
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

  return <DonationsManagement initialDonations={initialDonations} initialHasMore={initialHasMore} />;
}
