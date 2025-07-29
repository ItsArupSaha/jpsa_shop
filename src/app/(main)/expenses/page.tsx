
import { getExpensesPaginated } from '@/lib/actions';
import ExpensesManagement from '@/components/expenses-management';

export default async function ExpensesPage() {
  const { expenses, hasMore } = await getExpensesPaginated({ pageLimit: 10 });
  return <ExpensesManagement initialExpenses={expenses} initialHasMore={hasMore} />;
}
