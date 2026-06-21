'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { addExpense, updateExpense } from '@/lib/actions';
import type { Expense } from '@/lib/types';
import { cn } from '@/lib/utils';

import { expenseSchema, type ExpenseFormValues } from './schema';

interface AddExpenseDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingExpense: Expense | null;
  onSuccess: (expense: Expense, isEdit: boolean) => void;
}

export function AddExpenseDialog({
  userId,
  isOpen,
  onOpenChange,
  editingExpense,
  onSuccess,
}: AddExpenseDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: '',
      description: '',
      amount: 0,
      date: new Date(),
      paymentMethod: 'Cash',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (editingExpense) {
        form.reset({
          name: editingExpense.name || '',
          description: editingExpense.description || '',
          amount: editingExpense.amount || 0,
          date: new Date(editingExpense.date),
          paymentMethod: editingExpense.paymentMethod || 'Cash',
        });
      } else {
        form.reset({
          name: '',
          description: '',
          amount: 0,
          date: new Date(),
          paymentMethod: 'Cash',
        });
      }
    }
  }, [isOpen, editingExpense, form]);

  const onSubmit = (data: ExpenseFormValues) => {
    startTransition(async () => {
      try {
        if (editingExpense) {
          const updated = await updateExpense(userId, editingExpense.id, data);
          toast({ title: 'Expense Updated', description: 'The expense has been updated successfully.' });
          onSuccess(updated, true);
        } else {
          const added = await addExpense(userId, data);
          toast({ title: 'Expense Added', description: 'The new expense has been recorded.' });
          onSuccess(added, false);
        }
        onOpenChange(false);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save expense.' });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          <DialogDescription>
            {editingExpense ? 'Update the details for this expense.' : 'Enter the details for the new expense.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-4 pl-1 -mr-4 -ml-1">
              <div className="space-y-4 py-4 px-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          value={field.value || 'Cash'}
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
              </div>
            </div>
            <DialogFooter className="pt-4 border-t px-4 pb-4">
              <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save Expense"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
