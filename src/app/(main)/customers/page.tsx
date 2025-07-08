import CustomerManagement from '@/components/customer-management';
import { getCustomers } from '@/lib/actions';

export default async function CustomersPage() {
  const customers = await getCustomers();
  return <CustomerManagement initialCustomers={customers} />;
}
