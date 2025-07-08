import BookManagement from '@/components/book-management';
import { books } from '@/lib/data';

export default async function BooksPage() {
  // In a real app, you would fetch books from your database here.
  const bookData = books;

  return <BookManagement initialBooks={bookData} />;
}
