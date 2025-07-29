
import { getCustomersWithDueBalancePaginated } from '@/lib/actions';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ReceivablesManagement = dynamic(() => import('@/components/receivables-management'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex flex-col gap-2 items-end">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-9 w-64" />
        </div>
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
});

export default async function ReceivablesPage() {
  const { customersWithDue, hasMore } = await getCustomersWithDueBalancePaginated({ pageLimit: 10 });
  return <ReceivablesManagement initialCustomers={customersWithDue} initialHasMore={hasMore} />;
}
