
import { getSalesPaginated, getBooks, getCustomers } from '@/lib/actions';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const SalesManagement = dynamic(() => import('@/components/sales-management'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex flex-col gap-2 items-end">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-52" />
        </div>
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
});

export default async function SalesPage() {
  const [{ sales, hasMore }, books, customers] = await Promise.all([
    getSalesPaginated({ pageLimit: 10 }),
    getBooks(),
    getCustomers()
  ]);

  return <SalesManagement initialSales={sales} initialHasMore={hasMore} books={books} customers={customers} />;
}
