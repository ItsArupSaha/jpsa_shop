'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { addSale } from '@/lib/actions';

import type { Sale, Book, Customer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

const saleItemSchema = z.object({
  bookId: z.string().min(1, 'Book is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number(),
});

const saleFormSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  items: z.array(saleItemSchema).min(1, 'At least one item is required.'),
  discountType: z.enum(['none', 'percentage', 'amount']),
  discountValue: z.coerce.number().min(0, 'Discount must be non-negative').default(0),
  paymentMethod: z.enum(['Cash', 'Bank', 'Due'], { required_error: 'Payment method is required.'}),
}).refine(data => {
    if (data.discountType === 'percentage') {
        return data.discountValue >= 0 && data.discountValue <= 100;
    }
    return true;
}, {
    message: "Percentage discount must be between 0 and 100.",
    path: ['discountValue'],
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

interface SalesManagementProps {
  initialSales: Sale[];
  books: Book[];
  customers: Customer[];
}

export default function SalesManagement({ initialSales, books: allBooks, customers: allCustomers }: SalesManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      items: [{ bookId: '', quantity: 1, price: 0 }],
      discountType: 'none',
      discountValue: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const watchItems = form.watch('items');
  const watchDiscountType = form.watch('discountType');
  const watchDiscountValue = form.watch('discountValue');

  const { subtotal, discountAmount, total } = React.useMemo(() => {
    const subtotal = watchItems.reduce((acc, item) => {
      const quantity = Number(item.quantity) || 0;
      return acc + (item.price * quantity);
    }, 0);

    let discountAmount = 0;
    if (watchDiscountType === 'percentage') {
      discountAmount = subtotal * (watchDiscountValue / 100);
    } else if (watchDiscountType === 'amount') {
      discountAmount = watchDiscountValue;
    }
    
    // Ensure discount doesn't exceed subtotal
    discountAmount = Math.min(subtotal, discountAmount);

    const total = subtotal - discountAmount;
    return { subtotal, discountAmount, total };
  }, [watchItems, watchDiscountType, watchDiscountValue]);

  const handleAddNew = () => {
    const walkInCustomer = allCustomers.find(c => c.name === 'Walk-in Customer');
    form.reset({
      customerId: walkInCustomer?.id || '',
      items: [{ bookId: '', quantity: 1, price: 0 }],
      discountType: 'none',
      discountValue: 0,
      paymentMethod: 'Cash',
    });
    setIsDialogOpen(true);
  };
  
  const onSubmit = (data: SaleFormValues) => {
    startTransition(async () => {
      const saleData = { ...data, subtotal, total };
      const result = await addSale(saleData);

      if (result?.success) {
        toast({ title: 'Sale Recorded', description: 'The new sale has been added to the history.' });
        setIsDialogOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to record sale.' });
      }
    });
  };
  
  const getBookTitle = (bookId: string) => allBooks.find(b => b.id === bookId)?.title || 'Unknown Book';
  const getCustomerName = (customerId: string) => allCustomers.find(c => c.id === customerId)?.name || 'Unknown Customer';

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
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialSales.length > 0 ? initialSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{format(new Date(sale.date), 'PPP')}</TableCell>
                    <TableCell className="font-medium">{getCustomerName(sale.customerId)}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{sale.items.map(i => `${i.quantity}x ${getBookTitle(i.bookId)}`).join(', ')}</TableCell>
                    <TableCell>{sale.paymentMethod}</TableCell>
                    <TableCell className="text-right font-medium">${sale.total.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No sales recorded yet.</TableCell>
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
            <DialogTitle className="font-headline">Record a New Sale</DialogTitle>
            <DialogDescription>Select a customer and books to create a new sale.</DialogDescription>
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
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allCustomers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator />
                <FormLabel>Items</FormLabel>
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
                              <FormLabel className="text-xs">Book</FormLabel>
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
                              <div className="flex justify-between items-center">
                                <FormLabel className="text-xs">Quantity</FormLabel>
                                {selectedBook && (
                                  <span className="text-xs text-muted-foreground">
                                    In stock: {selectedBook.stock}
                                  </span>
                                )}
                              </div>
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ bookId: '', quantity: 1, price: 0 })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <FormLabel>Discount</FormLabel>
                     <div className="flex gap-2">
                       <FormField
                          control={form.control}
                          name="discountType"
                          render={({ field }) => (
                            <FormItem className="w-1/2">
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="percentage">%</SelectItem>
                                  <SelectItem value="amount">$</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <FormField
                            control={form.control}
                            name="discountValue"
                            render={({ field }) => (
                                <FormItem className={cn("w-1/2", watchDiscountType === 'none' && 'hidden')}>
                                    <FormControl>
                                        <Input type="number" placeholder="0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                     </div>
                  </div>
                  <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                           <FormLabel>Payment Method</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex gap-4 pt-2"
                            >
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <RadioGroupItem value="Cash" id="cash" />
                                </FormControl>
                                <FormLabel htmlFor="cash" className="font-normal">Cash</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <RadioGroupItem value="Bank" id="bank" />
                                </FormControl>
                                <FormLabel htmlFor="bank" className="font-normal">Bank</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <RadioGroupItem value="Due" id="due" />
                                </FormControl>
                                <FormLabel htmlFor="due" className="font-normal">Due</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                 <Separator />
                 <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between text-muted-foreground">
                        <span>Discount</span>
                        <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                 </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending || total < 0 || !form.formState.isValid}>{isPending ? "Confirming..." : "Confirm Sale"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
