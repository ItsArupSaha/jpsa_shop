
import SalesManagement from '@/components/sales-management';
import { getSalesPaginated, getBooks, getCustomers } from '@/lib/actions';

export default async function SalesPage() {
  const { sales, hasMore } = await getSalesPaginated({ pageLimit: 10 });
  const books = await getBooks();
  const customers = await getCustomers();

  return <SalesManagement initialSales={sales} initialHasMore={hasMore} books={books} customers={customers} />;
}
