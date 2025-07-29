
import { getSalesPaginated, getBooks, getCustomers } from '@/lib/actions';
import SalesManagement from '@/components/sales-management';
import { auth } from '@/lib/firebase';
import { redirect } from 'next/navigation';

export default async function SalesPage() {
  const user = auth?.currentUser;
  if (!user) {
    redirect('/login');
  }

  const [{ sales, hasMore }, books, customers] = await Promise.all([
    getSalesPaginated({ userId: user.uid, pageLimit: 10 }),
    getBooks(user.uid),
    getCustomers(user.uid)
  ]);

  return <SalesManagement initialSales={sales} initialHasMore={hasMore} books={books} customers={customers} userId={user.uid} />;
}
