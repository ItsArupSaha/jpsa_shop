import BookManagement from '@/components/book-management';
import { getBooks } from '@/lib/actions';

export default async function BooksPage() {
  const books = await getBooks();

  return <BookManagement initialBooks={books} />;
}
