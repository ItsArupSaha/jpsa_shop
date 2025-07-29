
import ReceivablesManagement from '@/components/receivables-management';
import { getCustomersWithDueBalancePaginated } from '@/lib/actions';

export default async function ReceivablesPage() {
  const { customersWithDue, hasMore } = await getCustomersWithDueBalancePaginated({ pageLimit: 10 });
  return <ReceivablesManagement initialCustomers={customersWithDue} initialHasMore={hasMore} />;
}
