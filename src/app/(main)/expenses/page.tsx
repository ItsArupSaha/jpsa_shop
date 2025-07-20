import ExpensesManagement from '@/components/expenses-management';
import { getExpensesPaginated } from '@/lib/actions';

export default async function ExpensesPage() {
  const { expenses, hasMore } = await getExpensesPaginated({ pageLimit: 10 });
  return <ExpensesManagement initialExpenses={expenses} initialHasMore={hasMore} />;
}
