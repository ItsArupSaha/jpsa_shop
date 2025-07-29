
import { getCustomersWithDueBalancePaginated } from '@/lib/actions';
import ReceivablesManagement from '@/components/receivables-management';
import { auth } from '@/lib/firebase';
import { redirect } from 'next/navigation';

export default async function ReceivablesPage() {
  const user = auth?.currentUser;
  if (!user) {
    redirect('/login');
  }
  const { customersWithDue, hasMore } = await getCustomersWithDueBalancePaginated({ userId: user.uid, pageLimit: 10 });
  return <ReceivablesManagement initialCustomers={customersWithDue} initialHasMore={hasMore} userId={user.uid} />;
}
