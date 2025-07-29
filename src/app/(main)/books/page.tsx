
import { getBooksPaginated } from '@/lib/actions';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const BookManagement = dynamic(() => import('@/components/book-management'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex flex-col gap-2 items-end">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-44" />
        </div>
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  ),
});


export default async function BooksPage() {
  const { books, hasMore } = await getBooksPaginated({ pageLimit: 10 });
  return <BookManagement initialBooks={books} initialHasMore={hasMore} />;
}
