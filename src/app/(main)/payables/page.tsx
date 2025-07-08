import TransactionsManagement from '@/components/transactions-management';
import { getTransactions } from '@/lib/actions';

export default async function PayablesPage() {
  const transactions = await getTransactions('Payable');
  return (
    <TransactionsManagement
      title="Track Payables"
      description="Manage amounts the bookstore owes."
      initialTransactions={transactions}
      type="Payable"
    />
  );
}
