
import PurchaseManagement from '@/components/purchase-management';
import { getPurchasesPaginated } from '@/lib/actions';

export default async function PurchasesPage() {
  const { purchases, hasMore } = await getPurchasesPaginated({ pageLimit: 10 });
  return <PurchaseManagement initialPurchases={purchases} initialHasMore={hasMore} />;
}
