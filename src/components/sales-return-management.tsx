
'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Loader2, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { getBooks, getCustomers, addSalesReturn, getSalesReturnsPaginated } from '@/lib/actions';

import type { SalesReturn, Book, Customer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectPortal } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from './ui/skeleton';

const salesReturnItemSchema = z.object({
  bookId: z.string().min(1, 'Book is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number(), // This is the original selling price
});

const salesReturnFormSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  items: z.array(salesReturnItemSchema).min(1, 'At least one item is required.'),
  refundMethod: z.enum(['Adjust Due', 'Cash', 'Bank'], { required_error: 'Refund method is required.'}),
});

type SalesReturnFormValues = z.infer<typeof salesReturnFormSchema>;

interface SalesReturnManagementProps {
    userId: string;
}

export default function SalesReturnManagement({ userId }: SalesReturnManagementProps) {
  const [returns, setReturns] = React.useState<SalesReturn[]>([]);
  const [books, setBooks] = React.useState<Book[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
        const [{ returns: newReturns, hasMore: newHasMore }, booksData, customersData] = await Promise.all([
            getSalesReturnsPaginated({ userId, pageLimit: 10 }),
            getBooks(userId),
            getCustomers(userId),
        ]);
        setReturns(newReturns);
        setHasMore(newHasMore);
        setBooks(booksData);
        setCustomers(customersData);
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not load data." });
    } finally {
        setIsInitialLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if(userId) loadInitialData();
  }, [userId, loadInitialData]);

  const getBookTitle = (bookId: string) => books.find(b => b.id === bookId)?.title || 'Unknown Book';
  const getCustomerName = (customerId: string) => customers.find(c => c.id === customerId)?.name || 'Unknown Customer';

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastReturnId = returns[returns.length - 1]?.id;
    try {
        const { returns: newReturns, hasMore: newHasMore } = await getSalesReturnsPaginated({ userId, pageLimit: 10, lastVisibleId: lastReturnId });
        setReturns(prev => [...prev, ...newReturns]);
        setHasMore(newHasMore);
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: "Could not load more returns." });
    } finally {
        setIsLoadingMore(false);
    }
  };

  const form = useForm<SalesReturnFormValues>({
    resolver: zodResolver(salesReturnFormSchema),
    defaultValues: {
      items: [{ bookId: '', quantity: 1, price: 0 }],
      refundMethod: 'Adjust Due',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const watchItems = form.watch('items');
  const totalReturnValue = watchItems.reduce((acc, item) => {
    const price = item.price || 0;
    const quantity = Number(item.quantity) || 0;
    return acc + (price * quantity);
  }, 0);

  const handleAddNew = () => {
    form.reset({
      customerId: '',
      items: [{ bookId: '', quantity: 1, price: 0 }],
      refundMethod: 'Adjust Due',
    });
    setIsDialogOpen(true);
  };
  
  const onSubmit = (data: SalesReturnFormValues) => {
    startTransition(async () => {
      const result = await addSalesReturn(userId, data);
      if (result?.success && result.salesReturn) {
        toast({ title: 'Return Recorded', description: 'The sales return has been successfully processed.' });
        loadInitialData();
        setIsDialogOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to record return.' });
      }
    });
  };

  return (
    <>
      <Card className="animate-in fade-in-50">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-2xl">Sales Returns</CardTitle>
              <CardDescription>Manage customer returns and refunds.</CardDescription>
            </div>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Record New Return
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Return ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Refund</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isInitialLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={`skeleton-${i}`}>
                            <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : returns.length > 0 ? returns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{format(new Date(r.date), 'PPP')}</TableCell>
                    <TableCell className="font-mono">{r.returnId}</TableCell>
                    <TableCell className="font-medium">{getCustomerName(r.customerId)}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {r.items.map(i => `${i.quantity}x ${getBookTitle(i.bookId)}`).join(', ')}
                    </TableCell>
                    <TableCell>{r.refundMethod}</TableCell>
                    <TableCell className="text-right font-medium">${r.totalReturnValue.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No returns recorded yet.</TableCell>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline">Record a Sales Return</DialogTitle>
            <DialogDescription>Select customer, items being returned, and refund method.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 p-1">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger></FormControl>
                        <SelectPortal><SelectContent>
                            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent></SelectPortal>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator />
                <FormLabel>Returned Items</FormLabel>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-end p-3 border rounded-md relative">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.bookId`}
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="text-xs">Book</FormLabel>
                            <Select onValueChange={(value) => {
                              const book = books.find(b => b.id === value);
                              field.onChange(value);
                              form.setValue(`items.${index}.price`, book?.sellingPrice || 0);
                            }} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select a book" /></SelectTrigger></FormControl>
                              <SelectPortal><SelectContent>
                                {books.map(book => (
                                  <SelectItem key={book.id} value={book.id} disabled={watchItems.some((i, itemIndex) => i.bookId === book.id && itemIndex !== index)}>
                                    {book.title}
                                  </SelectItem>
                                ))}
                              </SelectContent></SelectPortal>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Quantity</FormLabel>
                            <FormControl><Input type="number" min="1" placeholder="1" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => remove(index)} disabled={fields.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ bookId: '', quantity: 1, price: 0 })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
                <Separator />
                <FormField
                  control={form.control}
                  name="refundMethod"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Refund Method</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-4">
                          <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Adjust Due" /></FormControl><FormLabel className="font-normal">Adjust Due Balance</FormLabel></FormItem>
                          <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Cash" /></FormControl><FormLabel className="font-normal">Cash Refund</FormLabel></FormItem>
                          <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Bank" /></FormControl><FormLabel className="font-normal">Bank Refund</FormLabel></FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <Separator />
                 <div className="flex justify-between font-bold text-base pr-4">
                    <span>Total Return Value</span>
                    <span>${totalReturnValue.toFixed(2)}</span>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending || totalReturnValue <= 0 || !form.formState.isValid}>
                  {isPending ? "Recording..." : "Record Return"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
