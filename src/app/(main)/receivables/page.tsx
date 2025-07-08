import TransactionsManagement from '@/components/transactions-management';
import { receivables } from '@/lib/data';

export default function ReceivablesPage() {
  return (
    <TransactionsManagement
      title="Track Receivables"
      description="Manage amounts owed to the bookstore."
      initialTransactions={receivables}
      type="Receivable"
    />
  );
}
