
'use client';

import { addExpense, deleteExpense, getExpensesPaginated, getExpenses } from '@/lib/actions';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FileSpreadsheet, FileText, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Expense } from '@/lib/types';
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { useAuth } from '@/hooks/use-auth';

const expenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  date: z.date({ required_error: "An expense date is required." }),
  paymentMethod: z.enum(['Cash', 'Bank'], { required_error: "A payment method is required." }),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpensesManagementProps {
    userId: string;
}

export default function ExpensesManagement({ userId }: ExpensesManagementProps) {
  const { authUser } = useAuth();
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    const { expenses: newExpenses, hasMore: newHasMore } = await getExpensesPaginated({ userId, pageLimit: 5 });
    setExpenses(newExpenses);
    setHasMore(newHasMore);
    setIsInitialLoading(false);
  }, [userId]);

  React.useEffect(() => {
    if(userId) {
        loadInitialData();
    }
  }, [userId, loadInitialData]);


  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastExpenseId = expenses[expenses.length - 1]?.id;
    const { expenses: newExpenses, hasMore: newHasMore } = await getExpensesPaginated({ userId, pageLimit: 5, lastVisibleId: lastExpenseId });
    setExpenses(prev => [...prev, ...newExpenses]);
    setHasMore(newHasMore);
    setIsLoadingMore(false);
  };

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      amount: 0,
      paymentMethod: 'Cash',
    },
  });

  const handleAddNew = () => {
    form.reset({ description: '', amount: 0, date: new Date(), paymentMethod: 'Cash' });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
        await deleteExpense(userId, id);
        setExpenses(prev => prev.filter(e => e.id !== id));
        toast({ title: 'Expense Deleted', description: 'The expense has been removed.' });
    });
  };

  const onSubmit = (data: ExpenseFormValues) => {
    startTransition(async () => {
        const newExpense = await addExpense(userId, data);
        setExpenses(prev => [newExpense, ...prev]);
        toast({ title: 'Expense Added', description: 'The new expense has been recorded.' });
        setIsAddDialogOpen(false);
    });
  };
  
  const getFilteredExpenses = async () => {
    if (!dateRange?.from) {
        toast({
            variant: "destructive",
            title: "Please select a start date.",
        });
        return null;
    }
    
    const allExpenses = await getExpenses(userId);
    const from = dateRange.from;
    const to = dateRange.to || dateRange.from;
    to.setHours(23, 59, 59, 999);

    return allExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= from && expenseDate <= to;
    });
  }

  const handleDownloadPdf = async () => {
    const filteredExpenses = await getFilteredExpenses();
    if (!filteredExpenses || !authUser) return;

    if (filteredExpenses.length === 0) {
      toast({ title: 'No Expenses Found', description: 'There are no expenses in the selected date range.' });
      return;
    }

    const doc = new jsPDF();
    const dateString = `${format(dateRange!.from!, 'PPP')} - ${format(dateRange!.to! || dateRange!.from!, 'PPP')}`;
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

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
    doc.text('Expense Report', 105, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`For the period: ${dateString}`, 105, 51, { align: 'center' });
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 60,
      head: [['Date', 'Description', 'Method', 'Amount']],
      body: filteredExpenses.map(e => [
        format(new Date(e.date), 'yyyy-MM-dd'),
        e.description || '',
        e.paymentMethod || '',
        `$${e.amount.toFixed(2)}`
      ]).filter(row => row.every(cell => cell !== undefined)),
      foot: [
        [{ content: 'Total', colSpan: 3, styles: { halign: 'right' } }, `$${totalExpenses.toFixed(2)}`],
      ],
      footStyles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0] },
    });
    
    doc.save(`expense-report-${format(dateRange!.from!, 'yyyy-MM-dd')}-to-${format(dateRange!.to! || dateRange!.from!, 'yyyy-MM-dd')}.pdf`);
  };

  const handleDownloadCsv = async () => {
    const filteredExpenses = await getFilteredExpenses();
    if (!filteredExpenses) return;

    if (filteredExpenses.length === 0) {
      toast({ title: 'No Expenses Found', description: 'There are no expenses in the selected date range.' });
      return;
    }

    const csvData = filteredExpenses.map(e => ({
      Date: format(new Date(e.date), 'yyyy-MM-dd'),
      Description: e.description,
      Method: e.paymentMethod,
      Amount: e.amount.toFixed(2),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `expense-report-${format(dateRange!.from!, 'yyyy-MM-dd')}-to-${format(dateRange!.to! || dateRange!.from!, 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  return (
    <Card className="animate-in fade-in-50">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-2xl">Track Expenses</CardTitle>
              <CardDescription>Record and manage all bookstore expenses.</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
                <Button onClick={handleAddNew}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
                </Button>
                <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" /> Download Report
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Download Expense Report</DialogTitle>
                            <DialogDescription>Select a date range to download your expense data.</DialogDescription>
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
                                <p className="text-sm text-muted-foreground">
                                    {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                        Selected: {format(dateRange.from, "LLL dd, y")} -{" "}
                                        {format(dateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        <>Selected: {format(dateRange.from, "LLL dd, y")}</>
                                    )
                                    ) : (
                                    <span>Please pick a start and end date.</span>
                                    )}
                                </p>
                            </div>
                        </ScrollArea>
                        <DialogFooter className="gap-2 sm:justify-center pt-4 border-t">
                          <Button variant="outline" onClick={handleDownloadPdf} disabled={!dateRange?.from}><FileText className="mr-2 h-4 w-4" /> Download PDF</Button>
                          <Button variant="outline" onClick={handleDownloadCsv} disabled={!dateRange?.from}><FileSpreadsheet className="mr-2 h-4 w-4" /> Download CSV</Button>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInitialLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={`skeleton-${i}`}>
                          <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : expenses.length > 0 ? expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>{format(new Date(expense.date), 'PPP')}</TableCell>
                      <TableCell>{expense.paymentMethod}</TableCell>
                      <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)} disabled={isPending}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No expenses recorded.</TableCell>
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

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle className="font-headline">Add New Expense</DialogTitle>
                <DialogDescription>Enter the details for the new expense.</DialogDescription>
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
                        <Input placeholder="e.g., Office Supplies" {...field} />
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
                        <Input type="number" step="0.01" placeholder="50.00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>Payment Method</FormLabel>
                        <FormControl>
                        <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex gap-4"
                        >
                            <FormItem className="flex items-center space-x-2">
                            <FormControl><RadioGroupItem value="Cash" /></FormControl>
                            <FormLabel className="font-normal">Cash</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2">
                            <FormControl><RadioGroupItem value="Bank" /></FormControl>
                            <FormLabel className="font-normal">Bank</FormLabel>
                            </FormItem>
                        </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Expense Date</FormLabel>
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
                    <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save Expense"}</Button>
                </DialogFooter>
                </form>
            </Form>
            </DialogContent>
        </Dialog>
    </Card>
  );
}
