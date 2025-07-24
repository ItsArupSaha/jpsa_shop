
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Book, ShoppingCart, DollarSign, ArrowRightLeft } from 'lucide-react';
import { getBooks } from '@/lib/db/books';
import { getDashboardStats } from '@/lib/db/dashboard';
import { MonthlySummaryChart } from '@/components/dashboard-charts';

export default async function DashboardPage() {
  const [stats, books] = await Promise.all([
    getDashboardStats(),
    getBooks() 
  ]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in-50">
      <div className="flex justify-between items-start">
        <h1 className="font-headline text-3xl font-semibold">Dashboard</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Books in Stock</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBooksInStock}</div>
            <p className="text-xs text-muted-foreground">across {stats.totalBookTitles} titles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales this Month</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthlySalesValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats.monthlySalesCount} transactions recorded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit this Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              ${stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              After ${stats.monthlyExpenses.toLocaleString()} in expenses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Receivables</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.receivablesAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingReceivablesCount} customer(s) with due balance</p>
          </CardContent>
        </Card>
      </div>
      <div>
        <MonthlySummaryChart
            income={stats.monthlySalesValue}
            expenses={stats.monthlyExpenses}
            profit={stats.netProfit}
          />
      </div>
    </div>
  );
}
