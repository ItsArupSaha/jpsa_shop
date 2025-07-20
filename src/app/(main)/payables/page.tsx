import TransactionsManagement from '@/components/transactions-management';
import { getTransactionsPaginated } from '@/lib/actions';

export default async function PayablesPage() {
  const { transactions, hasMore } = await getTransactionsPaginated({ type: 'Payable', pageLimit: 15 });

  return (
    <TransactionsManagement
      title="Track Payables"
      description="Manage amounts the bookstore owes."
      type="Payable"
      initialTransactions={transactions}
      initialHasMore={hasMore}
    />
  );
}
