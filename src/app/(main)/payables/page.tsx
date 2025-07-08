import TransactionsManagement from '@/components/transactions-management';
import { payables } from '@/lib/data';

export default function PayablesPage() {
  return (
    <TransactionsManagement
      title="Track Payables"
      description="Manage amounts the bookstore owes."
      initialTransactions={payables}
      type="Payable"
    />
  );
}
