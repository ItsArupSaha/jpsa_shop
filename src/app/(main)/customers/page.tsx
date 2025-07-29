
import CustomerManagement from '@/components/customer-management';
import { getCustomersPaginated } from '@/lib/actions';

export default async function CustomersPage() {
  const { customers, hasMore } = await getCustomersPaginated({ pageLimit: 10 });
  return <CustomerManagement initialCustomers={customers} initialHasMore={hasMore} />;
}
