'use client';

import * as React from 'react';
import BookManagement from '@/components/book-management';
import { getBooksPaginated } from '@/lib/actions';
import type { Book } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function BooksPage() {
  const [initialBooks, setInitialBooks] = React.useState<Book[]>([]);
  const [initialHasMore, setInitialHasMore] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const { books, hasMore } = await getBooksPaginated({ pageLimit: 15 });
      setInitialBooks(books);
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

  return <BookManagement initialBooks={initialBooks} initialHasMore={initialHasMore} />;
}
