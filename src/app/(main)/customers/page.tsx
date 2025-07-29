
import { getCustomersPaginated } from '@/lib/actions';
import CustomerManagement from '@/components/customer-management';
import { auth } from '@/lib/firebase';
import { redirect } from 'next/navigation';

export default async function CustomersPage() {
  const user = auth?.currentUser;
  if (!user) {
    redirect('/login');
  }
  const { customers, hasMore } = await getCustomersPaginated({ userId: user.uid, pageLimit: 10 });
  return <CustomerManagement initialCustomers={customers} initialHasMore={hasMore} userId={user.uid} />;
}
