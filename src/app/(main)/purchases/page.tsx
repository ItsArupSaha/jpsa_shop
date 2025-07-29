
import { getPurchasesPaginated } from '@/lib/actions';
import PurchaseManagement from '@/components/purchase-management';
import { auth } from '@/lib/firebase';
import { redirect } from 'next/navigation';

export default async function PurchasesPage() {
  const user = auth?.currentUser;
  if (!user) {
    redirect('/login');
  }
  const { purchases, hasMore } = await getPurchasesPaginated({ userId: user.uid, pageLimit: 10 });
  return <PurchaseManagement initialPurchases={purchases} initialHasMore={hasMore} userId={user.uid} />;
}
