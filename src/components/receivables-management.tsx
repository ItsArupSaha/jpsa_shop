'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { DollarSign, FileSpreadsheet, FileText, Loader2, MoreVertical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  getCustomersWithDueBalance,
  getCustomersWithDueBalancePaginated,
  getPaidReceivablesForDateRange,
} from '@/lib/actions';
import type { CustomerWithDue, Transaction } from '@/lib/types';
import { Calendar } from './ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import ReceivePaymentDialog from './receive-payment-dialog';

import {
  generatePdf,
  generateXlsx,
  generateReceivedPaymentsPdf,
  generateReceivedPaymentsXlsx,
} from './receivables/receivables-export-utils';
import {
  PendingReceivablesTable,
  ReceivedPaymentsTable,
} from './receivables/receivables-list-tables';

interface ReceivablesManagementProps {
  userId: string;
}

export default function ReceivablesManagement({ userId }: ReceivablesManagementProps) {
  const { authUser } = useAuth();
  const [customers, setCustomers] = React.useState<CustomerWithDue[]>([]);
  const [receivedPayments, setReceivedPayments] = React.useState<Transaction[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingReceived, setIsLoadingReceived] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [reportType, setReportType] = React.useState<'pending' | 'received'>('pending');
  const { toast } = useToast();

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const { customersWithDue, hasMore: hasMoreData } = await getCustomersWithDueBalancePaginated({
        userId,
        pageLimit: 10,
      });
      setCustomers(customersWithDue);
      setHasMore(hasMoreData);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load receivables.' });
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId, toast]);

  const loadReceivedPayments = React.useCallback(async () => {
    setIsLoadingReceived(true);
    try {
      const startDate = new Date(2000, 0, 1);
      const endDate = new Date();
      const received = await getPaidReceivablesForDateRange(userId, startDate, endDate);
      setReceivedPayments(received);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load received payments.' });
    } finally {
      setIsLoadingReceived(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadInitialData();
      loadReceivedPayments();
    }
  }, [userId, loadInitialData, loadReceivedPayments]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastCustomer = customers[customers.length - 1];

    const lastVisible = {
      id: lastCustomer.id,
      dueBalance: lastCustomer.dueBalance,
    };

    try {
      const { customersWithDue: newCustomers, hasMore: newHasMore } =
        await getCustomersWithDueBalancePaginated({ userId, pageLimit: 10, lastVisible });
      setCustomers((prev) => [...prev, ...newCustomers]);
      setHasMore(newHasMore);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load more receivables.' });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleDownload = async (formatType: 'pdf' | 'xlsx') => {
    if (!authUser) return;

    if (reportType === 'pending') {
      await handlePendingDuesReport(formatType);
    } else {
      await handleReceivedPaymentsReport(formatType);
    }
    setIsDownloadDialogOpen(false);
  };

  const handlePendingDuesReport = async (formatType: 'pdf' | 'xlsx') => {
    let data;
    const targetDate = dateRange?.from || new Date();

    if (dateRange?.from) {
      const { getCustomersWithDueBalanceAsOfDate } = await import('@/lib/db/account-overview');
      data = await getCustomersWithDueBalanceAsOfDate(userId, targetDate);
    } else {
      data = await getCustomersWithDueBalance(userId);
    }

    if (data.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'There are no pending receivables to download.' });
      return;
    }

    if (formatType === 'pdf') {
      generatePdf(data, targetDate, authUser!);
    } else {
      generateXlsx(data, targetDate);
    }
  };

  const handleReceivedPaymentsReport = async (formatType: 'pdf' | 'xlsx') => {
    if (!dateRange || !dateRange.from) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a date range for the report.' });
      return;
    }
    const received = await getPaidReceivablesForDateRange(userId, dateRange.from, dateRange.to);

    if (received.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'No payments were received in this date range.' });
      return;
    }
    if (formatType === 'pdf') {
      generateReceivedPaymentsPdf(received, dateRange, authUser!);
    } else {
      generateReceivedPaymentsXlsx(received);
    }
  };

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-2xl">Pending Receivables</CardTitle>
            <CardDescription>A list of all customers with an outstanding balance.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <ReceivePaymentDialog
              userId={userId}
              onPaymentReceived={() => {
                loadInitialData();
                loadReceivedPayments();
              }}
            >
              <Button>
                <DollarSign className="mr-2 h-4 w-4" /> Receive Payment
              </Button>
            </ReceivePaymentDialog>

            <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DialogTrigger asChild>
                    <DropdownMenuItem onClick={() => setReportType('pending')}>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Pending Dues Report</span>
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <DialogTrigger asChild>
                    <DropdownMenuItem onClick={() => setReportType('received')}>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Received Payments Report</span>
                    </DropdownMenuItem>
                  </DialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>

              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Download Report</DialogTitle>
                  <DialogDescription>
                    {reportType === 'pending'
                      ? 'Download a report of all customers who currently owe money.'
                      : 'Select a date range for the received payments report.'}
                  </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[calc(100vh-20rem)] overflow-y-auto">
                  <div className="py-4 flex flex-col items-center">
                    {reportType === 'pending' && (
                      <div className="mb-2 text-sm text-center text-muted-foreground w-full px-4">
                        <p>Select an &quot;As of&quot; date.</p>
                        <p className="text-xs">Leave empty for today (current balance).</p>
                      </div>
                    )}
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                    />
                  </div>
                </ScrollArea>

                <DialogFooter className="gap-2 sm:justify-center pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleDownload('pdf')}
                    disabled={reportType === 'received' && !dateRange?.from}
                  >
                    <FileText className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload('xlsx')}
                    disabled={reportType === 'received' && !dateRange?.from}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <PendingReceivablesTable customers={customers} isLoading={isInitialLoading} />
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </CardContent>
      <CardContent className="border-t pt-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold font-headline mb-2">Received Payments</h3>
          <p className="text-sm text-muted-foreground">All payments received from the start of the company</p>
        </div>
        <ReceivedPaymentsTable receivedPayments={receivedPayments} isLoading={isLoadingReceived} />
      </CardContent>
    </Card>
  );
}
