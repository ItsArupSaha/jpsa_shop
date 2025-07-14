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
  Legend,
  Cell
} from 'recharts';

interface MonthlySummaryChartProps {
  income: number;
  expenses: number;
  profit: number;
}

export function MonthlySummaryChart({ income, expenses, profit }: MonthlySummaryChartProps) {
  const data = [
    { name: 'Income', value: income, fill: 'hsl(var(--chart-1))' },
    { name: 'Expenses', value: expenses, fill: 'hsl(var(--chart-2))' },
    { name: 'Profit', value: profit, fill: profit >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'},
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">This Month's Summary</CardTitle>
        <CardDescription>
          A visual summary of your income, expenses, and profit for the current month.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
               <XAxis 
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                }}
                cursor={{ fill: 'hsl(var(--muted))' }}
                formatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Bar dataKey="value" barSize={60}>
                 {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground">
            No data available for this month yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
