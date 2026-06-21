'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import {
  getAuthorityPresentationReport,
  type AuthorityPresentationReport as AuthorityReportData,
} from '@/lib/db/authority-presentation-report';

import { OverviewTables } from './authority/overview-tables';
import { exportAuthorityReportPdf } from './authority/authority-export-utils';

const formatCurrency = (amount: number) =>
  `BDT ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

interface AuthorityPresentationReportProps {
  userId: string;
}

export default function AuthorityPresentationReport({
  userId,
}: AuthorityPresentationReportProps) {
  const { authUser } = useAuth();
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<AuthorityReportData | null>(null);

  const runReport = async () => {
    if (!startDate || !endDate) {
      setError('Choose both a start date and an end date.');
      return;
    }
    setError(null);
    setLoading(true);
    setReport(null);
    const startYmd = format(startDate, 'yyyy-MM-dd');
    const endYmd = format(endDate, 'yyyy-MM-dd');
    const res = await getAuthorityPresentationReport(userId, startYmd, endYmd);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setReport(res.data);
  };

  const handleDownloadPdf = () => {
    if (!authUser || !report || !startDate || !endDate) return;
    exportAuthorityReportPdf(report, startDate, endDate, authUser);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in-50">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Authority presentation</CardTitle>
          <CardDescription>
            Snapshot of Owner&apos;s Equity / Net Worth at the start date, income and expense by
            period (partial first month, full months, partial last month), purchases in the range,
            closing equity at the end date, and the change in net worth over the range.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-2">
            <span className="text-sm font-medium">Start date</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">End date</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={runReport} disabled={loading || !startDate || !endDate}>
            {loading ? 'Building…' : 'Build report'}
          </Button>
          {report && !loading && (
            <Button variant="outline" onClick={handleDownloadPdf} disabled={!authUser}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {report && !loading && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-lg">Opening balance sheet</CardTitle>
              <CardDescription>
                As of {startDate ? format(startDate, 'PPP') : ''} (end of day), same basis as the
                balance sheet screen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OverviewTables overview={report.opening} highlightEquity />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-lg">Income and expense by period</CardTitle>
              <CardDescription>
                Sales totals as income; expenses exclude internal transfer lines (same filter as
                the expenses list).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Income (sales)</TableHead>
                    <TableHead className="text-right">Expense</TableHead>
                    <TableHead className="text-right">Net (income − expense)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.periods.map((row) => (
                    <TableRow key={`${row.fromYmd}-${row.toYmd}`}>
                      <TableCell>
                        <div className="font-medium">{row.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.fromYmd} → {row.toYmd}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.income)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.expense)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.net)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-lg">Purchases (books and items)</CardTitle>
              <CardDescription>
                All purchase records dated between the selected start and end (inclusive).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.purchases.length === 0 ? (
                <p className="text-sm text-muted-foreground">No purchases in this date range.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.purchases.map((p) => (
                      <TableRow key={p.purchaseId}>
                        <TableCell className="font-mono text-sm">{p.purchaseId}</TableCell>
                        <TableCell>{format(new Date(p.date), 'PP')}</TableCell>
                        <TableCell>{p.supplier}</TableCell>
                        <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                          {p.itemSummary || '—'}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(p.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-lg">Closing balance sheet</CardTitle>
              <CardDescription>As of {endDate ? format(endDate, 'PPP') : ''} (end of day).</CardDescription>
            </CardHeader>
            <CardContent>
              <OverviewTables overview={report.closing} highlightEquity />
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="font-headline text-lg">
                Change in Owner&apos;s Equity / Net Worth
              </CardTitle>
              <CardDescription>
                Compares the same line as the balance sheet PDF: total assets minus payables, at
                end of start day vs end of end day.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span>Equity at start</span>
                <span className="font-medium">{formatCurrency(report.equityStart)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Equity at end</span>
                <span className="font-medium">{formatCurrency(report.equityEnd)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t pt-3 text-base font-semibold">
                <span>Net change (profit if positive, loss if negative)</span>
                <span className={report.equityDelta >= 0 ? 'text-green-700' : 'text-destructive'}>
                  {formatCurrency(report.equityDelta)}
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
