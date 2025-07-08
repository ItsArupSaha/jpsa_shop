import ExpensesManagement from '@/components/expenses-management';
import { getExpenses } from '@/lib/actions';

export default async function ExpensesPage() {
  const expenses = await getExpenses();
  return <ExpensesManagement initialExpenses={expenses} />;
}
