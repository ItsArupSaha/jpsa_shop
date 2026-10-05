
'use client';
import SalesManagement from '@/components/sales-management';
import { useAuth } from '@/hooks/use-auth';
import { Book } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function FullPageSpinner() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <Book className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function SalesWithAutoOpen() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  if (!user) {
    return <FullPageSpinner />;
  }
  return <SalesManagement userId={user.uid} autoOpenNew={searchParams.get('new') === '1'} />;
}

export default function SalesPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <SalesWithAutoOpen />
    </Suspense>
  );
}
