'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Download, Edit, PlusCircle, Search, Trash2, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { deleteExpense, getExpenses } from '@/lib/actions';
import { formatTaka } from '@/lib/format';
import type { Expense } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { AddExpenseDialog } from './expenses/add-expense-dialog';
import { downloadExpensesPdf, downloadExpensesXlsx } from './expenses/expenses-export-utils';

interface ExpensesManagementProps {
  userId: string;
}

const PAGE_SIZE = 10;

export default function ExpensesManagement({ userId }: ExpensesManagementProps) {
  const { authUser } = useAuth();
  const [allExpenses, setAllExpenses] = React.useState<Expense[]>([]);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
  const [expensePendingDelete, setExpensePendingDelete] = React.useState<Expense | null>(null);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const expensesData = await getExpenses(userId);
      setAllExpenses(expensesData);
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

  const filteredExpenses = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allExpenses;
    return allExpenses.filter(e =>
      (e.expenseId || '').toLowerCase().includes(q) ||
      (e.name || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q)
    );
  }, [allExpenses, searchQuery]);

  const visibleExpenses = React.useMemo(
    () => filteredExpenses.slice(0, visibleCount),
    [filteredExpenses, visibleCount]
  );
  const hasMore = visibleCount < filteredExpenses.length;

  const handleAddNew = () => {
    setEditingExpense(null);
    setIsAddDialogOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    const expense = expensePendingDelete;
    if (!expense) return;
    startTransition(async () => {
      try {
        await deleteExpense(userId, expense.id);
        setAllExpenses(prev => prev.filter(e => e.id !== expense.id));
        toast({ title: 'Expense Deleted', description: 'The expense has been removed.' });
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete expense.' });
      } finally {
        setExpensePendingDelete(null);
      }
    });
  };

  const handleSuccess = (expense: Expense, isEdit: boolean) => {
    if (isEdit) {
      setAllExpenses(prev => prev.map(e => e.id === expense.id ? expense : e));
    } else {
      setAllExpenses(prev => [expense, ...prev]);
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
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <CardTitle className="font-headline text-2xl">Expenses</CardTitle>
              <CardDescription>Record and manage all store expenses.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
              </Button>
              <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Export
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
                    <Button variant="outline" onClick={handleDownloadPdf} disabled={!dateRange?.from}>PDF</Button>
                    <Button variant="outline" onClick={handleDownloadXlsx} disabled={!dateRange?.from}>Excel</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses by ID, name, or description..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Clear search"
                  className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSearchQuery('');
                    setVisibleCount(PAGE_SIZE);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground md:py-2">{filteredExpenses.length} expense(s)</p>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense ID</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Method</TableHead>
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
                      <TableCell><Skeleton className="h-5 w-[100px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : visibleExpenses.length > 0 ? visibleExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-mono">{expense.expenseId || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">{expense.description}</TableCell>
                    <TableCell className="whitespace-nowrap">{format(new Date(expense.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="hidden sm:table-cell">{expense.paymentMethod}</TableCell>
                    <TableCell className="text-right">{formatTaka(expense.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label="Edit expense" onClick={() => handleEdit(expense)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete expense" onClick={() => setExpensePendingDelete(expense)} disabled={isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No expenses recorded.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
                Load More
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

      <ConfirmDialog
        open={expensePendingDelete !== null}
        onOpenChange={(open) => !open && setExpensePendingDelete(null)}
        title="Delete this expense?"
        description={
          expensePendingDelete
            ? `"${expensePendingDelete.description || expensePendingDelete.name || 'This expense'}" (${formatTaka(expensePendingDelete.amount)}) will be removed from your records.`
            : ''
        }
        onConfirm={handleConfirmDelete}
        isPending={isPending}
      />
    </>
  );
}
