
import { getTransactionsPaginated } from '@/lib/actions';
import TransactionsManagement from '@/components/transactions-management';
import { auth } from '@/lib/firebase';
import { redirect } from 'next/navigation';

export default async function PayablesPage() {
  const user = auth?.currentUser;
  if (!user) {
    redirect('/login');
  }
  const { transactions, hasMore } = await getTransactionsPaginated({ userId: user.uid, type: 'Payable', pageLimit: 10 });

  return (
    <TransactionsManagement
      title="Track Payables"
      description="Manage amounts the bookstore owes."
      type="Payable"
      initialTransactions={transactions}
      initialHasMore={hasMore}
      userId={user.uid}
    />
  );
}
