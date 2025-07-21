import BookManagement from '@/components/book-management';
import { getBooksPaginated } from '@/lib/actions';

export default async function BooksPage() {
  const { books, hasMore } = await getBooksPaginated({ pageLimit: 15 });
  return <BookManagement initialBooks={books} initialHasMore={hasMore} />;
}
