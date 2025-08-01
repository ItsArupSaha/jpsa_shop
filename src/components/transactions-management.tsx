
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { getTransactionsPaginated, addTransaction, getTransactions } from '@/lib/actions';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { DateRange } from 'react-day-picker';

import type { Transaction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from './ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from './ui/scroll-area';

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
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    const { transactions: newTransactions, hasMore: newHasMore } = await getTransactionsPaginated({ userId, type, pageLimit: 5 });
    setTransactions(newTransactions);
    setHasMore(newHasMore);
    setIsInitialLoading(false);
  }, [userId, type]);

  React.useEffect(() => {
    if (userId) {
        loadInitialData();
    }
  }, [userId, loadInitialData]);

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

  const getFilteredTransactions = async () => {
    if (!dateRange?.from) {
        toast({ variant: "destructive", title: "Please select a start date." });
        return null;
    }
    const allTrans = await getTransactions(userId, type); // Fetch all for report
    const from = dateRange.from;
    const to = dateRange.to || dateRange.from;
    to.setHours(23, 59, 59, 999);
    return allTrans.filter(t => {
      const tDate = new Date(t.dueDate);
      return tDate >= from && tDate <= to;
    });
  }

  const handleDownloadPdf = async () => {
    const filteredTransactions = await getFilteredTransactions();
    if (!filteredTransactions || !authUser) return;
    if (filteredTransactions.length === 0) {
      toast({ title: `No Pending ${type}s Found`, description: `There are no pending ${type.toLowerCase()}s in the selected date range.` });
      return;
    }
    const doc = new jsPDF();
    const dateString = `${format(dateRange!.from!, 'PPP')} - ${format(dateRange!.to! || dateRange!.from!, 'PPP')}`;
    
    // Left side header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(authUser.companyName || 'Bookstore', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(authUser.address || '', 14, 26);
    doc.text(authUser.phone || '', 14, 32);

    // Right side header
    let yPos = 20;
    if (authUser.bkashNumber) {
        doc.text(`Bkash: ${authUser.bkashNumber}`, 200, yPos, { align: 'right' });
        yPos += 6;
    }
    if (authUser.bankInfo) {
        doc.text(`Bank: ${authUser.bankInfo}`, 200, yPos, { align: 'right' });
    }

    // Report Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Pending ${type}s Report`, 105, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`For the period: ${dateString}`, 105, 51, { align: 'center' });
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 60,
      head: [['Description', 'Due Date', 'Amount']],
      body: filteredTransactions.map(t => [
        t.description,
        format(new Date(t.dueDate), 'yyyy-MM-dd'),
        `$${t.amount.toFixed(2)}`
      ]),
    });
    doc.save(`pending-${type.toLowerCase()}s-report-${format(dateRange!.from!, 'yyyy-MM-dd')}.pdf`);
  };

  const handleDownloadXlsx = async () => {
    const filteredTransactions = await getFilteredTransactions();
    if (!filteredTransactions) return;
    if (filteredTransactions.length === 0) {
      toast({ title: `No Pending ${type}s Found`, description: `There are no pending ${type.toLowerCase()}s in the selected date range.` });
      return;
    }
    const dataToExport = filteredTransactions.map(t => ({
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
    XLSX.utils.book_append_sheet(workbook, worksheet, type);
    XLSX.writeFile(workbook, `pending-${type.toLowerCase()}s-report-${format(dateRange!.from!, 'yyyy-MM-dd')}.xlsx`);
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
                  <DialogTrigger asChild>
                      <Button variant="outline">
                          <Download className="mr-2 h-4 w-4" /> Download Report
                      </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                          <DialogTitle>Download {type} Report</DialogTitle>
                          <DialogDescription>Select a date range to download your pending {type.toLowerCase()} data.</DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[calc(100vh-20rem)] overflow-y-auto">
                        <div className="py-4 flex flex-col items-center gap-4">
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
                          <Button variant="outline" onClick={handleDownloadPdf} disabled={!dateRange?.from}><FileText className="mr-2 h-4 w-4" /> PDF</Button>
                          <Button variant="outline" onClick={handleDownloadXlsx} disabled={!dateRange?.from}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
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
                ) : transactions.length > 0 ? transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>{format(new Date(transaction.dueDate), 'PPP')}</TableCell>
                    <TableCell className="text-right">${transaction.amount.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No pending {type.toLowerCase()}s recorded.</TableCell>
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

    