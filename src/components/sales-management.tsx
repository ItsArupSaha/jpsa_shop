'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

import type { Sale, Book } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const saleItemSchema = z.object({
  bookId: z.string().min(1, 'Book is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number(), // This is the selling price at the time of the sale
});

const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'At least one item is required for a sale.'),
});

type SaleFormValues = z.infer<typeof saleSchema>;

interface SalesManagementProps {
  initialSales: Sale[];
  books: Book[];
}

export default function SalesManagement({ initialSales, books: allBooks }: SalesManagementProps) {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      items: [{ bookId: '', quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const watchItems = form.watch('items');
  const total = React.useMemo(() => {
    return watchItems.reduce((acc, item) => {
      const quantity = Number(item.quantity) || 0;
      return acc + (item.price * quantity);
    }, 0);
  }, [watchItems]);

  const handleAddNew = () => {
    form.reset({ items: [{ bookId: '', quantity: 1, price: 0 }] });
    setIsDialogOpen(true);
  };
  
  const onSubmit = (data: SaleFormValues) => {
    const newSale: Sale = {
      id: crypto.randomUUID(),
      date: new Date(),
      items: data.items.map(item => ({
        ...item,
        quantity: Number(item.quantity) || 0,
      })),
      total: total
    };
    
    // In a real app, you would also update book stock in the database here.
    setSales([newSale, ...sales]);
    toast({ title: 'Sale Recorded', description: 'The new sale has been added to the history.' });
    setIsDialogOpen(false);
  };
  
  const getBookTitle = (bookId: string) => allBooks.find(b => b.id === bookId)?.title || 'Unknown Book';

  return (
    <>
      <Card className="animate-in fade-in-50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="font-headline text-2xl">Record and View Sales</CardTitle>
              <CardDescription>Create new sales transactions and view past sales history.</CardDescription>
            </div>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Record New Sale
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length > 0 ? sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-xs">{sale.id.substring(0, 8)}</TableCell>
                    <TableCell>{format(sale.date, 'PPP')}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{sale.items.map(i => `${i.quantity}x ${getBookTitle(i.bookId)}`).join(', ')}</TableCell>
                    <TableCell className="text-right font-medium">${sale.total.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No sales recorded yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">Record a New Sale</DialogTitle>
            <DialogDescription>Select books and quantities to create a new sale.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {fields.map((field, index) => {
                  const selectedBook = allBooks.find(b => b.id === watchItems[index]?.bookId);
                  return (
                    <div key={field.id} className="flex gap-2 items-end p-3 border rounded-md relative">
                      <div className="flex-1 grid grid-cols-5 gap-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.bookId`}
                          render={({ field }) => (
                            <FormItem className="col-span-3">
                              <FormLabel>Book</FormLabel>
                              <Select onValueChange={(value) => {
                                const book = allBooks.find(b => b.id === value);
                                field.onChange(value);
                                form.setValue(`items.${index}.price`, book?.sellingPrice || 0);
                              }} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a book" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {allBooks.map(book => (
                                    <SelectItem key={book.id} value={book.id} disabled={watchItems.some((i, itemIndex) => i.bookId === book.id && itemIndex !== index)}>
                                      {book.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" max={selectedBook?.stock} placeholder="1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ bookId: '', quantity: 1, price: 0 })}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
              </Button>
              <Separator />
               <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
               </div>
              <DialogFooter>
                <Button type="submit" disabled={total <= 0 || !form.formState.isValid}>Confirm Sale</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
