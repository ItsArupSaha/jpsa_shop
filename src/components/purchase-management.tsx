'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { getPurchases, getBooks, addPurchase } from '@/lib/actions';

import type { Purchase, Book } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Textarea } from './ui/textarea';

const purchaseItemSchema = z.object({
  bookId: z.string().min(1, 'Book is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  cost: z.coerce.number().min(0, 'Cost must be non-negative'),
});

const purchaseFormSchema = z.object({
  supplier: z.string().min(1, 'Supplier is required'),
  invoiceNumber: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required.'),
  dueDate: z.date({ required_error: "A due date is required." }),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

export default function PurchaseManagement() {
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [books, setBooks] = React.useState<Book[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const getBookTitle = (bookId: string) => books.find(b => b.id === bookId)?.title || 'Unknown Book';

  const loadData = React.useCallback(async () => {
    const [initialPurchases, initialBooks] = await Promise.all([
      getPurchases(),
      getBooks(),
    ]);
    setPurchases(initialPurchases);
    setBooks(initialBooks);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplier: '',
      invoiceNumber: '',
      items: [{ bookId: '', quantity: 1, cost: 0 }],
      dueDate: new Date(),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const watchItems = form.watch('items');
  const totalAmount = watchItems.reduce((acc, item) => {
    const cost = item.cost || 0;
    const quantity = Number(item.quantity) || 0;
    return acc + (cost * quantity);
  }, 0);

  const handleAddNew = () => {
    form.reset({
      supplier: '',
      invoiceNumber: '',
      items: [{ bookId: '', quantity: 1, cost: 0 }],
      dueDate: new Date(),
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: PurchaseFormValues) => {
    startTransition(async () => {
      await addPurchase(data);
      toast({ title: 'Purchase Recorded', description: 'The new purchase has been added and stock updated.' });
      await loadData();
      setIsDialogOpen(false);
    });
  };

  return (
    <>
      <Card className="animate-in fade-in-50">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-2xl">Record Purchases</CardTitle>
              <CardDescription>Manage purchases of books and other assets for the store.</CardDescription>
            </div>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Record New Purchase
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.length > 0 ? purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>{format(new Date(purchase.date), 'PPP')}</TableCell>
                    <TableCell className="font-medium">{purchase.supplier}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {purchase.items.map(i => `${i.quantity}x ${getBookTitle(i.bookId)}`).join(', ')}
                    </TableCell>
                    <TableCell className="text-right font-medium">${purchase.totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No purchases recorded yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline">Record New Purchase</DialogTitle>
            <DialogDescription>Enter supplier details and the items purchased.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Main Street Books" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice # (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="INV-12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Separator />
                <FormLabel>Items</FormLabel>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-end p-3 border rounded-md relative">
                    <div className="flex-1 grid grid-cols-6 gap-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.bookId`}
                        render={({ field }) => (
                          <FormItem className="col-span-3">
                            <FormLabel className="text-xs">Book</FormLabel>
                            <Select onValueChange={(value) => {
                                field.onChange(value);
                                const book = books.find(b => b.id === value);
                                form.setValue(`items.${index}.cost`, book?.productionPrice || 0);
                            }} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a book" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {books.map(book => (
                                  <SelectItem key={book.id} value={book.id}>
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
                          name={`items.${index}.cost`}
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel className="text-xs">Unit Cost</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="col-span-1">
                            <FormLabel className="text-xs">Qty</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" placeholder="1" {...field} />
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
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ bookId: '', quantity: 1, cost: 0 })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
                <Separator />
                <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Payment Due Date</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} 
                                value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <div className="space-y-2 text-sm pr-4">
                  <div className="flex justify-between font-bold text-base">
                    <span>Total Amount</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending || totalAmount <= 0 || !form.formState.isValid}>
                  {isPending ? "Saving..." : "Confirm Purchase"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
