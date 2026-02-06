
'use client';

import { addTransaction, getTransactions, getTransactionsPaginated, getPaidPayables, getPaidPayablesForDateRange, updateTransactionStatus } from '@/lib/actions';
import { getPayablesAsOfDate } from '@/lib/db/account-overview';
import type { DateRange } from 'react-day-picker';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Check, Download, FileSpreadsheet, FileText, Loader2, MoreVertical, PlusCircle } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import * as XLSX from 'xlsx';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/lib/types';
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';

const transactionSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  dueDate: z.date({ required_error: "A due date is required." }),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionsManagementProps {
  title: string;
  description: string;
  type: 'Payable';
  userId: string;
}

export default function TransactionsManagement({ title, description, type, userId }: TransactionsManagementProps) {
  const { authUser } = useAuth();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [paidPayables, setPaidPayables] = React.useState<Transaction[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingPaid, setIsLoadingPaid] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [asOfDate, setAsOfDate] = React.useState<Date | undefined>();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [reportType, setReportType] = React.useState<'pending' | 'paid'>('pending');
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    const { transactions: newTransactions, hasMore: newHasMore } = await getTransactionsPaginated({ userId, type, pageLimit: 5 });
    setTransactions(newTransactions);
    setHasMore(newHasMore);
    setIsInitialLoading(false);
  }, [userId, type]);

  const loadPaidPayables = React.useCallback(async () => {
    setIsLoadingPaid(true);
    try {
      const paid = await getPaidPayables(userId);
      setPaidPayables(paid);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load paid payables.' });
    } finally {
      setIsLoadingPaid(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadInitialData();
      loadPaidPayables();
    }
  }, [userId, loadInitialData, loadPaidPayables]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastTransactionId = transactions[transactions.length - 1]?.id;
    const { transactions: newTransactions, hasMore: newHasMore } = await getTransactionsPaginated({ userId, type, pageLimit: 5, lastVisibleId: lastTransactionId });
    setTransactions(prev => [...prev, ...newTransactions]);
    setHasMore(newHasMore);
    setIsLoadingMore(false);
  };

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: '',
      amount: 0,
    },
  });

  const handleAddNew = () => {
    form.reset({ description: '', amount: 0, dueDate: new Date() });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: TransactionFormValues) => {
    startTransition(async () => {
      const newTransaction = await addTransaction(userId, { ...data, type });
      setTransactions(prev => [newTransaction, ...prev]);
      toast({ title: `${type} Added`, description: `The new ${type.toLowerCase()} has been recorded.` });
      setIsDialogOpen(false);
    });
  };

  const handleMarkAsPaid = async (transactionId: string) => {
    startTransition(async () => {
      await updateTransactionStatus(userId, transactionId, 'Paid', type);
      // Remove from pending list
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      // Reload paid payables to include the newly paid one
      loadPaidPayables();
      toast({ title: 'Payable Paid', description: 'The payable has been marked as paid.' });
    });
  };

  const handleDownload = async (formatType: 'pdf' | 'xlsx') => {
    if (!authUser) return;

    if (reportType === 'pending') {
      await handlePendingPayablesReport(formatType);
    } else {
      await handlePaidPayablesReport(formatType);
    }
    setIsDownloadDialogOpen(false);
  };

  const handlePendingPayablesReport = async (formatType: 'pdf' | 'xlsx') => {
    let data;
    const targetDate = asOfDate || new Date();

    if (asOfDate) {
      // Fetch historical pending payables as of selected date
      data = await getPayablesAsOfDate(userId, targetDate);
    } else {
      // Default to current live data
      data = await getTransactions(userId, type);
    }

    if (data.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'There are no pending payables to download.' });
      return;
    }

    if (formatType === 'pdf') {
      generatePendingPayablesPdf(data, targetDate);
    } else {
      generatePendingPayablesXlsx(data, targetDate);
    }
  };

  const handlePaidPayablesReport = async (formatType: 'pdf' | 'xlsx') => {
    if (!dateRange?.from) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a date range for the report.' });
      return;
    }

    const paid = await getPaidPayablesForDateRange(userId, dateRange.from, dateRange.to);

    if (paid.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'No paid payables found in this date range.' });
      return;
    }

    if (formatType === 'pdf') {
      generatePaidPayablesPdf(paid, dateRange.from, dateRange.to);
    } else {
      generatePaidPayablesXlsx(paid, dateRange.from, dateRange.to);
    }
  };

  const generatePendingPayablesPdf = (data: Transaction[], date: Date) => {
    const doc = new jsPDF();
    const validDate = date && !isNaN(date.getTime()) ? date : new Date();
    const dateString = format(validDate, 'PPP');

    const totalAmount = data.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Left side header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(authUser!.companyName || 'Bookstore', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(authUser!.address || '', 14, 26);
    doc.text(authUser!.phone || '', 14, 32);

    // Right side header
    let yPos = 20;
    if (authUser!.bkashNumber) {
      doc.text(`Bkash: ${authUser!.bkashNumber}`, 200, yPos, { align: 'right' });
      yPos += 6;
    }
    if (authUser!.bankInfo) {
      doc.text(`Bank: ${authUser!.bankInfo}`, 200, yPos, { align: 'right' });
    }

    // Report Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Pending Payables Report', 105, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`As of ${dateString}`, 105, 51, { align: 'center' });
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 60,
      head: [['Description', 'Due Date', 'Amount']],
      body: data.map(t => [
        t.description,
        format(new Date(t.dueDate), 'yyyy-MM-dd'),
        `BDT ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.amount)}`
      ]),
      foot: [[
        { content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
        `BDT ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalAmount)}`
      ]],
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    doc.save(`pending-payables-${format(validDate, 'yyyy-MM-dd')}.pdf`);
  };

  const generatePendingPayablesXlsx = (data: Transaction[], date: Date) => {
    const validDate = date && !isNaN(date.getTime()) ? date : new Date();
    const dataToExport = data.map(t => ({
      'Description': t.description,
      'Due Date': format(new Date(t.dueDate), 'yyyy-MM-dd'),
      'Amount': t.amount,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const columnWidths = Object.keys(dataToExport[0]).map(key => {
      const maxLength = Math.max(
        ...dataToExport.map(row => {
          const value = row[key as keyof typeof row];
          return typeof value === 'number' ? String(value).length : (value || '').length;
        }),
        key.length
      );
      return { wch: maxLength + 2 };
    });
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pending Payables');
    XLSX.writeFile(workbook, `pending-payables-${format(validDate, 'yyyy-MM-dd')}.xlsx`);
  };

  const generatePaidPayablesPdf = (data: Transaction[], fromDate: Date, toDate?: Date) => {
    const doc = new jsPDF();
    const totalAmount = data.reduce((sum, t) => sum + (t.amount || 0), 0);
    const dateString = toDate
      ? `${format(fromDate, 'PPP')} - ${format(toDate, 'PPP')}`
      : format(fromDate, 'PPP');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(authUser!.companyName || 'Bookstore', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(authUser!.address || '', 14, 26);
    doc.text(authUser!.phone || '', 14, 32);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Paid Payables Report', 105, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`For the period: ${dateString}`, 105, 51, { align: 'center' });
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 60,
      head: [['Description', 'Due Date', 'Amount']],
      body: data.map(t => [
        t.description,
        format(new Date(t.dueDate), 'yyyy-MM-dd'),
        `BDT ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.amount)}`
      ]),
      foot: [[
        { content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
        `BDT ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalAmount)}`
      ]],
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    doc.save(`paid-payables-${format(fromDate, 'yyyy-MM-dd')}.pdf`);
  };

  const generatePaidPayablesXlsx = (data: Transaction[], fromDate: Date, toDate?: Date) => {
    const dataToExport = data.map(t => ({
      'Description': t.description,
      'Due Date': format(new Date(t.dueDate), 'yyyy-MM-dd'),
      'Amount': t.amount,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Paid Payables');
    XLSX.writeFile(workbook, `paid-payables-${format(fromDate, 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <>
      <Card className="animate-in fade-in-50">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-2xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New {type}
              </Button>

              <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" /> Download Report
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DialogTrigger asChild>
                      <DropdownMenuItem onClick={() => setReportType('pending')}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Pending Payables Report</span>
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogTrigger asChild>
                      <DropdownMenuItem onClick={() => setReportType('paid')}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Paid Payables Report</span>
                      </DropdownMenuItem>
                    </DialogTrigger>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Download Report</DialogTitle>
                    <DialogDescription>
                      {reportType === 'pending'
                        ? 'Download pending payables as of a specific date.'
                        : 'Select a date range (e.g., monthly/quarterly) for paid payables.'}
                    </DialogDescription>
                  </DialogHeader>

                  {reportType === 'pending' && (
                    <ScrollArea className="max-h-[calc(100vh-20rem)] overflow-y-auto">
                      <div className="py-4 flex flex-col items-center">
                        <div className="mb-2 text-sm text-center text-muted-foreground w-full px-4">
                          <p>Select an &quot;As of&quot; date.</p>
                          <p className="text-xs">Leave empty for today (current balance).</p>
                        </div>
                        <Calendar
                          initialFocus
                          mode="single"
                          selected={asOfDate}
                          onSelect={setAsOfDate}
                        />
                        {asOfDate && (
                          <Button
                            variant="outline"
                            className="mt-2"
                            onClick={() => setAsOfDate(undefined)}
                          >
                            Clear Date (Use Today)
                          </Button>
                        )}
                      </div>
                    </ScrollArea>
                  )}

                  {reportType === 'paid' && (
                    <ScrollArea className="max-h-[calc(100vh-20rem)] overflow-y-auto">
                      <div className="py-4 flex flex-col items-center">
                        <div className="mb-2 text-sm text-center text-muted-foreground w-full px-4">
                          <p>Select a date range for the report.</p>
                          <p className="text-xs">E.g., monthly, quarterly, or custom period.</p>
                        </div>
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
                    <Button variant="outline" onClick={() => handleDownload('pdf')}>
                      <FileText className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                    <Button variant="outline" onClick={() => handleDownload('xlsx')}>
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
                  <TableHead>Description</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isInitialLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : transactions.length > 0 ? transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>{format(new Date(transaction.dueDate), 'PPP')}</TableCell>
                    <TableCell className="text-right">৳{transaction.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleMarkAsPaid(transaction.id)} disabled={isPending}>
                            <Check className="mr-2 h-4 w-4" />
                            <span>Mark as Paid</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No pending {type.toLowerCase()}s recorded.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</> : 'Load More'}
              </Button>
            </div>
          )}
        </CardContent>

        {/* Paid Payables Section */}
        <CardContent className="border-t pt-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold font-headline mb-2">Paid Payables</h3>
            <p className="text-sm text-muted-foreground">All payables that have been marked as paid</p>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPaid ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={`paid-skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : paidPayables.length > 0 ? paidPayables.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>{format(new Date(transaction.dueDate), 'PPP')}</TableCell>
                    <TableCell className="text-right text-primary font-bold">৳{transaction.amount.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                      No paid payables yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Add New {type}</DialogTitle>
            <DialogDescription>Enter the details for the new {type.toLowerCase()}.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder={`e.g., Publisher Invoice`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="100.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : `Save ${type}`}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

