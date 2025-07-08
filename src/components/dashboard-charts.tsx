'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import type { Sale, Transaction } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from './ui/badge';

interface RecentSalesChartProps {
  sales: Sale[];
}

export function RecentSalesChart({ sales }: RecentSalesChartProps) {
  const recentSalesData = sales
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 7) // Last 7 sales
    .map((sale) => ({
      name: format(sale.date, 'MMM d'),
      total: sale.total,
    }))
    .reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Recent Sales</CardTitle>
        <CardDescription>
          A chart of your last 7 sales transactions.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        {recentSalesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={recentSalesData}>
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                }}
                cursor={{ fill: 'hsl(var(--muted))' }}
              />
              <Bar
                dataKey="total"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground">
            No sales data to display.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface UpcomingPaymentsProps {
  receivables: Transaction[];
  payables: Transaction[];
}

export function UpcomingPayments({
  receivables,
  payables,
}: UpcomingPaymentsProps) {
  const upcoming = [
    ...receivables
      .filter((t) => t.status === 'Pending')
      .map((t) => ({ ...t, type: 'Receivable' })),
    ...payables
      .filter((t) => t.status === 'Pending')
      .map((t) => ({ ...t, type: 'Payable' })),
  ]
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Upcoming Payments</CardTitle>
        <CardDescription>
          A summary of due receivables and payables.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {upcoming.length > 0 ? (
          <div className="space-y-4">
            {upcoming.map((item) => (
              <div key={item.id} className="flex items-center">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {item.description}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Due: {format(item.dueDate, 'PPP')}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <div
                    className={`font-medium ${
                      item.type === 'Receivable'
                        ? 'text-primary'
                        : 'text-destructive'
                    }`}
                  >
                    {item.type === 'Receivable' ? '+' : '-'}$
                    {item.amount.toFixed(2)}
                  </div>
                  <Badge
                    variant={
                      item.type === 'Receivable' ? 'default' : 'destructive'
                    }
                    className="text-xs"
                  >
                    {item.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No upcoming payments.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
