import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Book, ShoppingCart, CreditCard, ArrowRightLeft } from 'lucide-react';

export default function DashboardPage() {
  // In a real app, these values would be fetched from the backend.
  const stats = {
    totalBooks: 15 + 8 + 22 + 30 + 12,
    monthlySales: 2,
    monthlyExpenses: 3,
    pendingReceivables: 1,
    expensesAmount: 1500 + 250 + 800,
    receivablesAmount: 350.00,
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in-50">
      <h1 className="font-headline text-3xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBooks}</div>
            <p className="text-xs text-muted-foreground">titles in inventory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales this Month</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlySales}</div>
            <p className="text-xs text-muted-foreground">transactions recorded</p>
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
            <p className="text-xs text-muted-foreground">{stats.pendingReceivables} pending transaction</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Recent Sales</CardTitle>
            <CardDescription>A quick look at the most recent sales.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Recent sales chart or list will go here.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Upcoming Payments</CardTitle>
            <CardDescription>A summary of due receivables and payables.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Upcoming receivables/payables list will go here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
