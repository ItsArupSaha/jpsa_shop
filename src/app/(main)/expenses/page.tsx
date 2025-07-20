import ExpensesManagement from '@/components/expenses-management';
import { getExpenses } from '@/lib/actions';

export default async function ExpensesPage() {
  const initialExpenses = await getExpenses();
  return <ExpensesManagement initialExpenses={initialExpenses} />;
}
