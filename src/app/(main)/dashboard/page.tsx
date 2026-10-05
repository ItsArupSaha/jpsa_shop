
'use client';

import { MonthlySummaryChart } from '@/components/dashboard-charts';
import { EditCompanyDetailsDialog } from '@/components/edit-company-details-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { getCustomers, getSalesPaginated } from '@/lib/actions';
import { getDashboardStats } from '@/lib/db/dashboard';
import { formatTaka } from '@/lib/format';
import type { Customer, Sale } from '@/lib/types';
import {
  ArrowRightLeft,
  Banknote,
  BookOpen,
  CalendarClock,
  Coins,
  Settings,
  ShoppingCart,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import * as React from 'react';

type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;

export default function DashboardPage() {
  const { user, authUser } = useAuth();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = React.useState<Sale[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadFailed, setLoadFailed] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const statsPromise = getDashboardStats(user.uid);
    const salesPromise = getSalesPaginated({ userId: user.uid, pageLimit: 5 })
      .then((r) => r.sales)
      .catch(() => [] as Sale[]);
    const customersPromise = getCustomers(user.uid).catch(() => [] as Customer[]);

    Promise.all([statsPromise, salesPromise, customersPromise])
      .then(([statsData, sales, customerList]) => {
        if (cancelled) return;
        setStats(statsData);
        setRecentSales(sales);
        setCustomers(customerList);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dashboard:', err);
        if (cancelled) return;
        setLoadFailed(true);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (isLoading || !stats || !authUser) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in-50">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2"><CardContent className="p-5"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
          <Card><CardContent className="p-5"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load the dashboard</CardTitle>
          <CardDescription>
            Something went wrong while fetching your numbers. Please refresh the page to try again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const customerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div className="flex flex-col gap-6 animate-in fade-in-50">
      {/* Greeting + quick actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-semibold">
            {greeting()}, {authUser?.displayName?.split(' ')[0] || 'friend'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here is how {authUser?.companyName || 'your store'} is doing — {format(new Date(), 'EEEE, d MMMM yyyy')}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="lg" className="h-11 px-6 text-base">
            <Link href="/sales?new=1">
              <ShoppingCart className="mr-2 h-5 w-5" /> New Sale
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11">
            <Link href="/purchases">
              <ShoppingBag className="mr-2 h-4 w-4" /> Record Purchase
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11">
            <Link href="/receivables">
              <Coins className="mr-2 h-4 w-4" /> Receive Payment
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11">
            <Link href="/items">
              <CalendarClock className="mr-2 h-4 w-4" /> Stock on a Date
            </Link>
          </Button>
          <EditCompanyDetailsDialog user={authUser}>
            <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Edit store details">
              <Settings className="h-4 w-4" />
            </Button>
          </EditCompanyDetailsDialog>
        </div>
      </div>

      {/* Main KPI row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-primary text-primary-foreground">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium opacity-90">Sales Today</p>
              <ShoppingCart className="h-4 w-4 opacity-80" />
            </div>
            <p className="text-3xl font-bold mt-2">{formatTaka(stats.todaySalesValue)}</p>
            <p className="text-xs opacity-80 mt-1">{stats.todaySalesCount} sale(s) recorded today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Sales This Month</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold mt-2">{formatTaka(stats.monthlySalesValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.monthlySalesCount} transactions this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Net Profit This Month</p>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className={`text-3xl font-bold mt-2 ${stats.netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatTaka(stats.netProfit)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">After {formatTaka(stats.monthlyExpenses)} expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Money in Hand</p>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold mt-2">{formatTaka(stats.cashBalance + stats.bankBalance)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cash {formatTaka(stats.cashBalance)} · Bank {formatTaka(stats.bankBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-dashed">
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowRightLeft className="h-8 w-8 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Pending Receivables</p>
              <p className="text-xl font-bold truncate">{formatTaka(stats.receivablesAmount)}</p>
              <p className="text-xs text-muted-foreground">{stats.pendingReceivablesCount} customer(s) owe</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Stock Value (at cost)</p>
              <p className="text-xl font-bold truncate">{formatTaka(stats.stockValue)}</p>
              <p className="text-xs text-muted-foreground">{stats.totalItemsInStock} copies · {stats.totalItemTitles} titles</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-4 flex items-center gap-3">
            <ShoppingBag className="h-8 w-8 text-chart-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Expenses This Month</p>
              <p className="text-xl font-bold truncate">{formatTaka(stats.monthlyExpenses)}</p>
              <p className="text-xs text-muted-foreground">Includes purchase payments</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="p-4 flex items-center gap-3">
            <Coins className="h-8 w-8 text-chart-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Average Sale This Month</p>
              <p className="text-xl font-bold truncate">
                {formatTaka(stats.monthlySalesCount > 0 ? stats.monthlySalesValue / stats.monthlySalesCount : 0)}
              </p>
              <p className="text-xs text-muted-foreground">Per transaction</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart + recent sales */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" /> This Month at a Glance
            </CardTitle>
            <CardDescription>Sales, expenses and profit for the current month.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <MonthlySummaryChart
              income={stats.monthlySalesValue}
              expenses={stats.monthlyExpenses}
              profit={stats.netProfit}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Sales</CardTitle>
                <CardDescription>The last 5 sales recorded.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sales">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3">
            {recentSales.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No sales yet — tap “New Sale” to record your first one.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs">{sale.saleId}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(sale.date), 'dd MMM')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[120px]">
                        <div className="flex flex-col">
                          <span className="truncate text-sm">{customerName(sale.customerId)}</span>
                          <Badge variant="outline" className="w-fit mt-0.5 text-[10px]">{sale.paymentMethod}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatTaka(sale.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function greeting(): string {
  const hour = parseInt(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Dhaka' }), 10);
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
