
'use client';

import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DollarSign, FileSpreadsheet, FileText, Loader2, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import * as XLSX from 'xlsx';
import ReceivePaymentDialog from './receive-payment-dialog';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getCustomersWithDueBalance, getCustomersWithDueBalancePaginated, getPaidReceivablesForDateRange } from '@/lib/actions';
import type { CustomerWithDue, Transaction } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Calendar } from './ui/calendar';
import type { DateRange } from 'react-day-picker';
import { ScrollArea } from './ui/scroll-area';

interface ReceivablesManagementProps {
    userId: string;
}

export default function ReceivablesManagement({ userId }: ReceivablesManagementProps) {
  const { authUser } = useAuth();
  const [customers, setCustomers] = React.useState<CustomerWithDue[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [reportType, setReportType] = React.useState<'pending' | 'received'>('pending');
  const { toast } = useToast();
  
  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
        const { customersWithDue, hasMore } = await getCustomersWithDueBalancePaginated({ userId, pageLimit: 10 });
        setCustomers(customersWithDue);
        setHasMore(hasMore);
    } catch(e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load receivables.' });
    } finally {
        setIsInitialLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
        loadInitialData();
    }
  }, [userId, loadInitialData]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastCustomer = customers[customers.length - 1];
    
    const lastVisible = {
        id: lastCustomer.id,
        dueBalance: lastCustomer.dueBalance,
    };

    try {
        const { customersWithDue: newCustomers, hasMore: newHasMore } = await getCustomersWithDueBalancePaginated({ userId, pageLimit: 10, lastVisible });
        setCustomers(prev => [...prev, ...newCustomers]);
        setHasMore(newHasMore);
    } catch(e) {
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
      const allCustomersWithDue = await getCustomersWithDueBalance(userId);

      if (allCustomersWithDue.length === 0) {
        toast({ variant: 'destructive', title: 'No Data', description: 'There are no pending receivables to download.' });
        return;
      }
      const reportDate = format(new Date(), 'yyyy-MM-dd');
      if (formatType === 'pdf') {
        generatePdf(allCustomersWithDue);
      } else {
        generateXlsx(allCustomersWithDue);
      }
  }

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
        generateReceivedPaymentsPdf(received);
    } else {
        generateReceivedPaymentsXlsx(received);
    }
  }

  const generatePdf = (data: CustomerWithDue[]) => {
      const doc = new jsPDF();
      const dateString = format(new Date(), 'PPP');
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(authUser!.companyName || 'Bookstore', 14, 20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(authUser!.address || '', 14, 26);
      doc.text(authUser!.phone || '', 14, 32);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Pending Receivables Report', 105, 45, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`As of ${dateString}`, 105, 51, { align: 'center' });
      doc.setTextColor(0);
      autoTable(doc, { startY: 60, head: [['Customer', 'Phone', 'Due Amount']], body: data.map(c => [c.name, c.phone, `৳${c.dueBalance.toFixed(2)}`]) });
      doc.save(`pending-receivables-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }

  const generateXlsx = (data: CustomerWithDue[]) => {
      const dataToExport = data.map(c => ({ 'Customer': c.name, 'Phone': c.phone, 'Due Amount': c.dueBalance }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Receivables');
      XLSX.writeFile(workbook, `pending-receivables-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }
  
  const generateReceivedPaymentsPdf = (data: Transaction[]) => {
    const doc = new jsPDF();
    const dateString = `${format(dateRange!.from!, 'PPP')} - ${dateRange!.to ? format(dateRange!.to, 'PPP') : ''}`;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(authUser!.companyName || 'Bookstore', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(authUser!.address || '', 14, 26);
    doc.text(authUser!.phone || '', 14, 32);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Received Payments Report', 105, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(dateString, 105, 51, { align: 'center' });
    doc.setTextColor(0);
    autoTable(doc, { startY: 60, head: [['Date', 'Customer', 'Method', 'Amount']], body: data.map(t => [format(new Date(t.dueDate), 'PPP'), t.customerName || 'N/A', t.paymentMethod || 'N/A', `৳${t.amount.toFixed(2)}`]) });
    doc.save(`received-payments-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }

  const generateReceivedPaymentsXlsx = (data: Transaction[]) => {
      const dataToExport = data.map(t => ({ 'Date': format(new Date(t.dueDate), 'yyyy-MM-dd'), 'Customer': t.customerName, 'Method': t.paymentMethod, 'Amount': t.amount }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Received Payments');
      XLSX.writeFile(workbook, `received-payments-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  return (
      <Card className="animate-in fade-in-50">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-2xl">Pending Receivables</CardTitle>
              <CardDescription>A list of all customers with an outstanding balance.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 items-end">
                <ReceivePaymentDialog userId={userId} onPaymentReceived={loadInitialData}>
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
                        
                        {reportType === 'received' && (
                            <ScrollArea className="max-h-[calc(100vh-20rem)] overflow-y-auto">
                                <div className="py-4 flex justify-center">
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
                        )}
                        
                        <DialogFooter className="gap-2 sm:justify-center pt-4 border-t">
                            <Button variant="outline" onClick={() => handleDownload('pdf')} disabled={reportType === 'received' && !dateRange?.from}>
                                <FileText className="mr-2 h-4 w-4" /> Download PDF
                            </Button>
                            <Button variant="outline" onClick={() => handleDownload('xlsx')} disabled={reportType === 'received' && !dateRange?.from}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Total Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {isInitialLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : customers.length > 0 ? customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                        <Link href={`/customers/${customer.id}`} className="hover:underline text-primary">
                            {customer.name}
                        </Link>
                    </TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">৳{customer.dueBalance.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                        No pending receivables. Great job!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading...</> : 'Load More'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
  );
}
