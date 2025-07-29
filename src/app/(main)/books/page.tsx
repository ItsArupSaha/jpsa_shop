
import { getBooksPaginated } from '@/lib/actions';
import BookManagement from '@/components/book-management';

export default async function BooksPage() {
  const { books, hasMore } = await getBooksPaginated({ pageLimit: 10 });
  return <BookManagement initialBooks={books} initialHasMore={hasMore} />;
}
