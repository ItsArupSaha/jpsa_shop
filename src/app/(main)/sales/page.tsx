
import SalesManagement from '@/components/sales-management';
import { getBooks, getCustomers } from '@/lib/actions';

// We can still pre-load static or less frequently changing data on the server
export default async function SalesPage() {
  const [books, customers] = await Promise.all([
    getBooks(),
    getCustomers(),
  ]);

  return (
    <SalesManagement
      initialBooks={books}
      initialCustomers={customers}
    />
  );
}
