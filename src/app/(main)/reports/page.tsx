
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ReportGenerator = dynamic(() => import('@/components/report-generator'), {
  ssr: false,
  loading: () => (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
         <Skeleton className="h-4 w-1/2" />
      </div>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-40" />
    </div>
  )
});

export default function ReportsPage() {
  return <ReportGenerator />;
}
