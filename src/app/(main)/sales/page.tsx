import SalesManagement from '@/components/sales-management';
import { sales, books } from '@/lib/data';

export default function SalesPage() {
  return <SalesManagement initialSales={sales} books={books} />;
}
