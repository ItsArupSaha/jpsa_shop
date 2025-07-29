
import { getTransactionsPaginated } from '@/lib/actions';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const TransactionsManagement = dynamic(() => import('@/components/transactions-management'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex flex-col gap-2 items-end">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-48" />
        </div>
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
});

export default async function PayablesPage() {
  const { transactions, hasMore } = await getTransactionsPaginated({ type: 'Payable', pageLimit: 10 });

  return (
    <TransactionsManagement
      title="Track Payables"
      description="Manage amounts the bookstore owes."
      type="Payable"
      initialTransactions={transactions}
      initialHasMore={hasMore}
    />
  );
}
