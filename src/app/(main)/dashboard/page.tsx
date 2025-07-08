import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Book, ShoppingCart, CreditCard, ArrowRightLeft } from 'lucide-react';
import { books, sales, expenses, receivables, payables } from '@/lib/data';
import { RecentSalesChart, UpcomingPayments } from '@/components/dashboard-charts';

export default function DashboardPage() {
  const totalBooks = books.reduce((sum, book) => sum + book.stock, 0);
  const salesThisMonth = sales.filter(s => new Date(s.date).getMonth() === new Date().getMonth() && new Date(s.date).getFullYear() === new Date().getFullYear());
  const salesAmountThisMonth = salesThisMonth.reduce((sum, sale) => sum + sale.total, 0);
  const expensesThisMonth = expenses.filter(e => new Date(e.date).getMonth() === new Date().getMonth() && new Date(e.date).getFullYear() === new Date().getFullYear());
  const expensesAmount = expensesThisMonth.reduce((sum, expense) => sum + expense.amount, 0);
  const pendingReceivables = receivables.filter(r => r.status === 'Pending');
  const receivablesAmount = pendingReceivables.reduce((sum, r) => sum + r.amount, 0);


  const stats = {
    totalBooks: totalBooks,
    monthlySalesValue: salesAmountThisMonth,
    monthlyExpenses: expensesThisMonth.length,
    pendingReceivables: pendingReceivables.length,
    expensesAmount: expensesAmount,
    receivablesAmount: receivablesAmount,
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in-50">
      <h1 className="font-headline text-3xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Books in Stock</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBooks}</div>
            <p className="text-xs text-muted-foreground">across {books.length} titles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales this Month</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthlySalesValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{salesThisMonth.length} transactions recorded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses this Month</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.expensesAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats.monthlyExpenses} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Receivables</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.receivablesAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingReceivables} pending transaction(s)</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <RecentSalesChart sales={sales} />
        </div>
        <div className="lg:col-span-3">
          <UpcomingPayments receivables={receivables} payables={payables} />
        </div>
      </div>
    </div>
  );
}
