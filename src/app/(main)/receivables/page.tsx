import ReceivablesManagement from '@/components/receivables-management';
import { getCustomersWithDueBalance } from '@/lib/actions';

export default async function ReceivablesPage() {
  const customersWithDue = await getCustomersWithDueBalance();
  return <ReceivablesManagement initialCustomersWithDue={customersWithDue} />;
}
