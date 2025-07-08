import TransactionsManagement from '@/components/transactions-management';
import { getTransactions } from '@/lib/actions';

export default async function ReceivablesPage() {
  const transactions = await getTransactions('Receivable');
  return (
    <TransactionsManagement
      title="Track Receivables"
      description="Manage amounts owed to the bookstore."
      initialTransactions={transactions}
      type="Receivable"
    />
  );
}
