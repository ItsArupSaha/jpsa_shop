'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Download, Edit, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { deleteExpense, getExpensesPaginated } from '@/lib/actions';
import type { Expense } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { AddExpenseDialog } from './expenses/add-expense-dialog';
import { downloadExpensesPdf, downloadExpensesXlsx } from './expenses/expenses-export-utils';

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
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const { expenses: newExpenses, hasMore: newHasMore } = await getExpensesPaginated({ userId, pageLimit: 5 });
      setExpenses(newExpenses);
      setHasMore(newHasMore);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load expenses.' });
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
    const lastExpenseId = expenses[expenses.length - 1]?.id;
    try {
      const { expenses: newExpenses, hasMore: newHasMore } = await getExpensesPaginated({ userId, pageLimit: 5, lastVisibleId: lastExpenseId });
      setExpenses(prev => [...prev, ...newExpenses]);
      setHasMore(newHasMore);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load more expenses.' });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleAddNew = () => {
    setEditingExpense(null);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteExpense(userId, id);
        setExpenses(prev => prev.filter(e => e.id !== id));
        toast({ title: 'Expense Deleted', description: 'The expense has been removed.' });
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete expense.' });
      }
    });
  };

  const handleSuccess = (expense: Expense, isEdit: boolean) => {
    if (isEdit) {
      setExpenses(prev => prev.map(e => e.id === expense.id ? expense : e));
    } else {
      setExpenses(prev => [expense, ...prev]);
    }
    loadInitialData();
  };

  const handleDownloadPdf = async () => {
    try {
      const success = await downloadExpensesPdf(userId, dateRange, authUser);
      if (!success) {
        toast({ title: 'No Expenses Found', description: 'There are no expenses in the selected date range.' });
      }
      setIsDownloadDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to download PDF.' });
    }
  };

  const handleDownloadXlsx = async () => {
    try {
      const success = await downloadExpensesXlsx(userId, dateRange);
      if (!success) {
        toast({ title: 'No Expenses Found', description: 'There are no expenses in the selected date range.' });
      }
      setIsDownloadDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to download Excel.' });
    }
  };

  return (
    <>
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
                    </div>
                  </ScrollArea>
                  <DialogFooter className="gap-2 sm:justify-center pt-4 border-t">
                    <Button variant="outline" onClick={handleDownloadPdf} disabled={!dateRange?.from}>Download PDF</Button>
                    <Button variant="outline" onClick={handleDownloadXlsx} disabled={!dateRange?.from}>Download Excel</Button>
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
                  <TableHead>Expense ID</TableHead>
                  <TableHead>Name</TableHead>
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
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[100px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : expenses.length > 0 ? expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-mono">{expense.expenseId || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{expense.name}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{format(new Date(expense.date), 'PPP')}</TableCell>
                    <TableCell>{expense.paymentMethod}</TableCell>
                    <TableCell className="text-right">৳{expense.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)} disabled={isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No expenses recorded.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : 'Load More'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddExpenseDialog
        userId={userId}
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        editingExpense={editingExpense}
        onSuccess={handleSuccess}
      />
    </>
  );
}
