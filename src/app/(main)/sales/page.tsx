import SalesManagement from '@/components/sales-management';
import { getSales, getBooks, getCustomers } from '@/lib/actions';

export default async function SalesPage() {
  const [initialSales, books, customers] = await Promise.all([
    getSales(),
    getBooks(),
    getCustomers(),
  ]);

  return <SalesManagement initialSales={initialSales} books={books} customers={customers} />;
}
