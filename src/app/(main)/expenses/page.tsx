
import { getExpensesPaginated } from '@/lib/actions';
import ExpensesManagement from '@/components/expenses-management';
import { auth } from '@/lib/firebase';
import { redirect } from 'next/navigation';

export default async function ExpensesPage() {
  const user = auth?.currentUser;
  if (!user) {
    redirect('/login');
  }
  const { expenses, hasMore } = await getExpensesPaginated({ userId: user.uid, pageLimit: 10 });
  return <ExpensesManagement initialExpenses={expenses} initialHasMore={hasMore} userId={user.uid} />;
}
