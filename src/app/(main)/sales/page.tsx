
import { getSalesPaginated, getBooks, getCustomers } from '@/lib/actions';
import SalesManagement from '@/components/sales-management';

export default async function SalesPage() {
  const [{ sales, hasMore }, books, customers] = await Promise.all([
    getSalesPaginated({ pageLimit: 10 }),
    getBooks(),
    getCustomers()
  ]);

  return <SalesManagement initialSales={sales} initialHasMore={hasMore} books={books} customers={customers} />;
}
