
import { getExpensesPaginated } from '@/lib/actions';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ExpensesManagement = dynamic(() => import('@/components/expenses-management'), {
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

export default async function ExpensesPage() {
  const { expenses, hasMore } = await getExpensesPaginated({ pageLimit: 10 });
  return <ExpensesManagement initialExpenses={expenses} initialHasMore={hasMore} />;
}
