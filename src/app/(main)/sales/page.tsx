
import SalesManagement from '@/components/sales-management';
import { getSalesPaginated, getBooks, getCustomers } from '@/lib/actions';

export default async function SalesPage() {
  const [salesResult, books, customers] = await Promise.all([
    getSalesPaginated({ pageLimit: 10 }),
    getBooks(),
    getCustomers(),
  ]);

  return (
    <SalesManagement
      initialSales={salesResult.sales}
      initialHasMore={salesResult.hasMore}
      initialBooks={books}
      initialCustomers={customers}
    />
  );
}
