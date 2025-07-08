import SalesManagement from '@/components/sales-management';
import { sales, books, customers } from '@/lib/data';

export default function SalesPage() {
  return <SalesManagement initialSales={sales} books={books} customers={customers} />;
}
