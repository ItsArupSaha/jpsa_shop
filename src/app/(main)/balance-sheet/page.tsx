
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const BalanceSheet = dynamic(() => import('@/components/balance-sheet'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center text-center h-64 border-2 border-dashed rounded-lg">
          <Skeleton className="h-6 w-56 mb-2" />
          <Skeleton className="h-4 w-80" />
      </div>
    </div>
  )
});

export default function BalanceSheetPage() {
  return <BalanceSheet />;
}
