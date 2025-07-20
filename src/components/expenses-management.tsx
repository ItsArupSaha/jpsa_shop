import type { Expense } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpensesClient } from './expenses-client';

interface ExpensesManagementProps {
  initialExpenses: Expense[];
  initialHasMore: boolean;
}

export default function ExpensesManagement({ initialExpenses, initialHasMore }: ExpensesManagementProps) {

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-2xl">Track Expenses</CardTitle>
            <CardDescription>Record and manage all bookstore expenses.</CardDescription>
          </div>
          <ExpensesClient initialExpenses={initialExpenses} initialHasMore={initialHasMore} />
        </div>
      </CardHeader>
      <CardContent>
        {/* The table and other client-side logic are now in ExpensesClient */}
      </CardContent>
    </Card>
  );
}
