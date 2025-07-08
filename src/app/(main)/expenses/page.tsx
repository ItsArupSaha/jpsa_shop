import ExpensesManagement from '@/components/expenses-management';
import { expenses } from '@/lib/data';

export default function ExpensesPage() {
  return <ExpensesManagement initialExpenses={expenses} />;
}
