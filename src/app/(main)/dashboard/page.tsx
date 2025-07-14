import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Book, ShoppingCart, DollarSign, ArrowRightLeft, Database } from 'lucide-react';
import { getBooks, getSales, getExpenses, getTransactions, seedDatabase, getCustomers } from '@/lib/actions';
import { MonthlySummaryChart } from '@/components/dashboard-charts';
import { Button } from '@/components/ui/button';
import { revalidatePath } from 'next/cache';

async function handleSeedDatabase() {
  'use server';
  await seedDatabase();
  revalidatePath('/dashboard');
}


export default async function DashboardPage() {
  const [books, sales, expenses, receivables, customers] = await Promise.all([
    getBooks(),
    getSales(),
    getExpenses(),
    getTransactions('Receivable'),
    getCustomers(),
  ]);

  const totalBooks = books.reduce((sum, book) => sum + book.stock, 0);

  const salesThisMonth = sales.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate.getMonth() === new Date().getMonth() && saleDate.getFullYear() === new Date().getFullYear();
  });
  const salesAmountThisMonth = salesThisMonth.reduce((sum, sale) => sum + sale.total, 0);
  
  const expensesThisMonth = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getMonth() === new Date().getMonth() && expenseDate.getFullYear() === new Date().getFullYear()
  });
  const expensesAmount = expensesThisMonth.reduce((sum, expense) => sum + expense.amount, 0);
  
  const pendingReceivables = receivables.filter(r => r.status === 'Pending');
  const receivablesAmount = pendingReceivables.reduce((sum, r) => sum + r.amount, 0);

  const grossProfitThisMonth = salesThisMonth.reduce((totalProfit, sale) => {
    const saleProfit = sale.items.reduce((currentSaleProfit, item) => {
      const book = books.find(b => b.id === item.bookId);
      if (book) {
        const itemProfit = (item.price - book.productionPrice) * item.quantity;
        return currentSaleProfit + itemProfit;
      }
      return currentSaleProfit;
    }, 0);
    return totalProfit + saleProfit;
  }, 0);

  const netProfitThisMonth = grossProfitThisMonth - expensesAmount;

  const stats = {
    totalBooks: totalBooks,
    monthlySalesValue: salesAmountThisMonth,
    netProfit: netProfitThisMonth,
    pendingReceivables: pendingReceivables.length,
    receivablesAmount: receivablesAmount,
  };

  const isDataEmpty = books.length === 0 && customers.length === 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in-50">
      <div className="flex justify-between items-start">
        <h1 className="font-headline text-3xl font-semibold">Dashboard</h1>
        {isDataEmpty && (
          <form action={handleSeedDatabase}>
            <Button variant="outline">
              <Database className="mr-2" /> Seed Database
            </Button>
          </form>
        )}
      </div>
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
            <CardTitle className="text-sm font-medium">Net Profit this Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              ${stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              After ${expensesAmount.toLocaleString()} in expenses
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
            <p className="text-xs text-muted-foreground">{stats.pendingReceivables} pending transaction(s)</p>
          </CardContent>
        </Card>
      </div>
      <div>
        <MonthlySummaryChart
            income={salesAmountThisMonth}
            expenses={expensesAmount}
            profit={netProfitThisMonth}
          />
      </div>
    </div>
  );
}