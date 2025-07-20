import TransactionsManagement from '@/components/transactions-management';
import { getTransactions } from '@/lib/actions';

export default async function PayablesPage() {
  const initialTransactions = await getTransactions('Payable');

  return (
    <TransactionsManagement
      title="Track Payables"
      description="Manage amounts the bookstore owes."
      type="Payable"
      initialTransactions={initialTransactions}
    />
  );
}
