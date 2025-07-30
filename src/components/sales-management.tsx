
'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { getSalesPaginated, getBooks, getCustomers, addSale } from '@/lib/actions';

import type { Sale, Book, Customer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectPortal } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { SaleDetailsDialog } from './sale-details-dialog';
import { Badge } from './ui/badge';
import { Calendar } from './ui/calendar';
import type { DateRange } from 'react-day-picker';
import { SaleMemo } from './sale-memo';
import { ScrollArea } from './ui/scroll-area';
import { DownloadSaleMemo } from './download-sale-memo';
import { Skeleton } from './ui/skeleton';

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
  paymentMethod: z.enum(['Cash', 'Bank', 'Due', 'Split'], { required_error: 'Payment method is required.'}),
  amountPaid: z.coerce.number().optional(),
}).refine(data => {
    if (data.discountType === 'percentage') {
        return data.discountValue >= 0 && data.discountValue <= 100;
    }
    return true;
}, {
    message: "Percentage discount must be between 0 and 100.",
    path: ['discountValue'],
}).refine(data => {
    if (data.paymentMethod === 'Split') {
        return data.amountPaid !== undefined && data.amountPaid > 0;
    }
    return true;
}, {
    message: "Amount paid is required for split payments.",
    path: ['amountPaid'],
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

export default function SalesManagement() {
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [books, setBooks] = React.useState<Book[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [completedSale, setCompletedSale] = React.useState<Sale | null>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
        const [{ sales: newSales, hasMore: newHasMore }, booksData, customersData] = await Promise.all([
            getSalesPaginated({ pageLimit: 5 }),
            getBooks(),
            getCustomers(),
        ]);
        setSales(newSales);
        setHasMore(newHasMore);
        setBooks(booksData);
        setCustomers(customersData);
    } catch (error) {
        console.error("Failed to load initial sales data:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load data. Please try again later.",
        });
    } finally {
        setIsInitialLoading(false);
    }
}, [toast]);

  React.useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);


  const getBookTitle = (bookId: string) => books.find(b => b.id === bookId)?.title || 'Unknown Book';
  const getCustomerName = (customerId: string) => customers.find(c => c.id === customerId)?.name || 'Unknown Customer';

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastSaleId = sales[sales.length - 1]?.id;
    try {
        const { sales: newSales, hasMore: newHasMore } = await getSalesPaginated({ pageLimit: 5, lastVisibleId: lastSaleId });
        setSales(prev => [...prev, ...newSales]);
        setHasMore(newHasMore);
    } catch(e) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load more sales.",
        });
    } finally {
        setIsLoadingMore(false);
    }
  };


  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      items: [{ bookId: '', quantity: 1, price: 0 }],
      discountType: 'none',
      discountValue: 0,
      paymentMethod: 'Cash',
      amountPaid: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const watchItems = form.watch('items');
  const watchDiscountType = form.watch('discountType');
  const watchDiscountValue = form.watch('discountValue');
  const watchPaymentMethod = form.watch('paymentMethod');
  const watchAmountPaid = form.watch('amountPaid');

  const subtotal = watchItems.reduce((acc, item) => {
    const price = item.price || 0;
    const quantity = Number(item.quantity) || 0;
    return acc + (price * quantity);
  }, 0);

  let discountAmount = 0;
  if (watchDiscountType === 'percentage') {
    discountAmount = subtotal * (watchDiscountValue / 100);
  } else if (watchDiscountType === 'amount') {
    discountAmount = watchDiscountValue;
  }
  discountAmount = Math.min(subtotal, discountAmount);

  const total = subtotal - discountAmount;
  
  let dueAmount = 0;
  if (watchPaymentMethod === 'Due') {
    dueAmount = total;
  } else if (watchPaymentMethod === 'Split') {
    dueAmount = total - (watchAmountPaid || 0);
  }

  const handleAddNew = () => {
    const walkInCustomer = customers.find(c => c.name === 'Walk-in Customer');
    form.reset({
      customerId: walkInCustomer?.id || '',
      items: [{ bookId: '', quantity: 1, price: 0 }],
      discountType: 'none',
      discountValue: 0,
      paymentMethod: 'Cash',
      amountPaid: 0,
    });
    setCompletedSale(null);
    setIsDialogOpen(true);
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setCompletedSale(null);
    }
    setIsDialogOpen(open);
  }

  const onSubmit = (data: SaleFormValues) => {
    startTransition(async () => {
      const result = await addSale(data);

      if (result?.success && result.sale) {
        toast({ title: 'Sale Recorded', description: 'The new sale has been added to the history.' });
        // Instead of refetching all, just add the new sale to the top.
        setSales(prev => [result.sale!, ...prev]);
        const updatedBooks = await getBooks();
        setBooks(updatedBooks);
        setCompletedSale(result.sale);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to record sale.' });
      }
    });
  };

  const getFilteredSales = () => {
    if (!dateRange?.from) {
        toast({
            variant: "destructive",
            title: "Please select a start date.",
        });
        return null;
    }
    
    const from = dateRange.from;
    const to = dateRange.to || dateRange.from;
    to.setHours(23, 59, 59, 999);

    return sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= from && saleDate <= to;
    });
  }
  
  const handleDownloadPdf = () => {
    const filteredSales = getFilteredSales();
    if (!filteredSales) return;

    if (filteredSales.length === 0) {
      toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
      return;
    }

    const doc = new jsPDF();
    const dateString = `${format(dateRange!.from!, 'PPP')} - ${format(dateRange!.to! || dateRange!.from!, 'PPP')}`;
    doc.text(`Sales Report: ${dateString}`, 14, 15);
    
    autoTable(doc, {
      startY: 20,
      head: [['Date', 'Customer', 'Items', 'Payment', 'Total']],
      body: filteredSales.map(sale => [
        format(new Date(sale.date), 'yyyy-MM-dd'),
        getCustomerName(sale.customerId),
        sale.items.map(i => `${i.quantity}x ${getBookTitle(i.bookId)}`).join(', '),
        sale.paymentMethod,
        `$${sale.total.toFixed(2)}`
      ]),
    });
    
    doc.save(`sales-report-${format(dateRange!.from!, 'yyyy-MM-dd')}-to-${format(dateRange!.to! || dateRange!.from!, 'yyyy-MM-dd')}.pdf`);
  };

  const handleDownloadCsv = () => {
    const filteredSales = getFilteredSales();
    if (!filteredSales) return;

    if (filteredSales.length === 0) {
      toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
      return;
    }

    const csvData = filteredSales.map(sale => ({
      Date: format(new Date(sale.date), 'yyyy-MM-dd'),
      Customer: getCustomerName(sale.customerId),
      Items: sale.items.map(i => `${i.quantity}x ${getBookTitle(i.bookId)}`).join('; '),
      'Payment Method': sale.paymentMethod,
      Total: sale.total.toFixed(2),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sales-report-${format(dateRange!.from!, 'yyyy-MM-dd')}-to-${format(dateRange!.to! || dateRange!.from!, 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  return (
    <>
      <Card className="animate-in fade-in-50">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-2xl">Record and View Sales</CardTitle>
              <CardDescription>Create new sales transactions and view past sales history.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 items-end">
                <Button onClick={handleAddNew}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Record New Sale
                </Button>
                <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" /> Download Reports
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Download Sales Report</DialogTitle>
                            <DialogDescription>Select a date range to download your sales data.</DialogDescription>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
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
                            <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : sales.length > 0 ? sales.map((sale) => {
                  const customer = customers.find(c => c.id === sale.customerId);
                  return (
                    <TableRow key={sale.id}>
                      <TableCell>{format(new Date(sale.date), 'PPP')}</TableCell>
                      <TableCell className="font-medium">{customer?.name || 'Unknown Customer'}</TableCell>
                      <TableCell className="max-w-[300px]">
                        {sale.items.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span>
                                    {sale.items[0].quantity}x {getBookTitle(sale.items[0].bookId)}
                                </span>
                                {sale.items.length > 1 && (
                                    <SaleDetailsDialog sale={sale} books={books}>
                                        <Badge variant="secondary" className="cursor-pointer hover:bg-muted">
                                            +{sale.items.length - 1} more
                                        </Badge>
                                    </SaleDetailsDialog>
                                )}
                            </div>
                        )}
                      </TableCell>
                      <TableCell>{sale.paymentMethod}</TableCell>
                      <TableCell className="text-right font-medium">${sale.total.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {customer && (
                          <DownloadSaleMemo sale={sale} customer={customer} books={books} />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                }) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No sales recorded yet.</TableCell>
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

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-2xl">
          {completedSale ? (
             <SaleMemo sale={completedSale} customer={customers.find(c => c.id === completedSale.customerId)!} books={books} onNewSale={handleAddNew}/>
          ) : (
            <>
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
                            <SelectPortal>
                              <SelectContent>
                                {customers.map(customer => (
                                  <SelectItem key={customer.id} value={customer.id}>
                                    {customer.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </SelectPortal>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Separator />
                    <FormLabel>Items</FormLabel>
                    {fields.map((field, index) => {
                      const selectedBook = books.find(b => b.id === watchItems[index]?.bookId);
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
                                    const book = books.find(b => b.id === value);
                                    field.onChange(value);
                                    form.setValue(`items.${index}.price`, book?.sellingPrice || 0);
                                  }} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a book" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectPortal>
                                      <SelectContent>
                                        {books.map(book => (
                                          <SelectItem key={book.id} value={book.id} disabled={watchItems.some((i, itemIndex) => i.bookId === book.id && itemIndex !== index)}>
                                            {book.title}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </SelectPortal>
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
                                    <SelectPortal>
                                      <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="percentage">%</SelectItem>
                                        <SelectItem value="amount">$</SelectItem>
                                      </SelectContent>
                                    </SelectPortal>
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
                                  className="flex flex-wrap gap-4 pt-2"
                                >
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl><RadioGroupItem value="Cash" id="cash" /></FormControl>
                                    <FormLabel htmlFor="cash" className="font-normal">Cash</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl><RadioGroupItem value="Bank" id="bank" /></FormControl>
                                    <FormLabel htmlFor="bank" className="font-normal">Bank</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl><RadioGroupItem value="Due" id="due" /></FormControl>
                                    <FormLabel htmlFor="due" className="font-normal">Due</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl><RadioGroupItem value="Split" id="split" /></FormControl>
                                    <FormLabel htmlFor="split" className="font-normal">Split</FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                     {watchPaymentMethod === 'Split' && (
                        <FormField
                            control={form.control}
                            name="amountPaid"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount Paid Now</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" placeholder="Enter amount paid" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    <Separator />
                    <div className="space-y-2 text-sm pr-4">
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
                        { (watchPaymentMethod === 'Due' || watchPaymentMethod === 'Split') && (
                            <div className="flex justify-between font-semibold text-destructive">
                                <span>Due Amount</span>
                                <span>${dueAmount.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isPending || total <= 0 || !form.formState.isValid}>{isPending ? "Confirming..." : "Confirm Sale"}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
