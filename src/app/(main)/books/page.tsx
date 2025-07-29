
import { getBooksPaginated } from '@/lib/actions';
import BookManagement from '@/components/book-management';
import { auth } from '@/lib/firebase';
import { redirect } from 'next/navigation';

export default async function BooksPage() {
  const user = auth?.currentUser;
  if (!user) {
    redirect('/login');
  }
  const { books, hasMore } = await getBooksPaginated({ userId: user.uid, pageLimit: 10 });
  return <BookManagement initialBooks={books} initialHasMore={hasMore} userId={user.uid} />;
}
