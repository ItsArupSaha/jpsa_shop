
'use client';

import { addSale, deleteSale, getCustomers, getItems, getSales, getSalesPaginated } from '@/lib/actions';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CalendarIcon, Download, FileSpreadsheet, FileText, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import * as XLSX from 'xlsx';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Customer, Item, Sale } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { DownloadSaleMemo } from './download-sale-memo';
import { SaleDetailsDialog } from './sale-details-dialog';
import { SaleMemo } from './sale-memo';
import { Badge } from './ui/badge';
import { Calendar } from './ui/calendar';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const saleItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number(),
});

const saleFormSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  date: z.date({ required_error: "A sale date is required." }),
  items: z.array(saleItemSchema).min(1, 'At least one item is required.'),
  discountType: z.enum(['none', 'percentage', 'amount']),
  discountValue: z.coerce.number().min(0, 'Discount must be non-negative').default(0),
  paymentMethod: z.enum(['Cash', 'Bank', 'Due', 'Split', 'Paid by Credit'], { required_error: 'Payment method is required.'}),
  amountPaid: z.coerce.number().optional(),
  splitPaymentMethod: z.enum(['Cash', 'Bank']).optional(),
  creditApplied: z.coerce.number().optional(),
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
        return data.amountPaid !== undefined && data.amountPaid > 0 && !!data.splitPaymentMethod;
    }
    return true;
}, {
    message: "Amount paid and its method are required for split payments.",
    path: ['amountPaid'],
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

interface SalesManagementProps {
    userId: string;
}

export default function SalesManagement({ userId }: SalesManagementProps) {
  const { authUser } = useAuth();
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
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
        const [{ sales: newSales, hasMore: newHasMore }, itemsData, customersData] = await Promise.all([
            getSalesPaginated({ userId, pageLimit: 5 }),
            getItems(userId),
            getCustomers(userId),
        ]);
        setSales(newSales);
        setHasMore(newHasMore);
        setItems(itemsData);
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
}, [userId, toast]);

  React.useEffect(() => {
    if(userId) {
        loadInitialData();
    }
  }, [userId, loadInitialData]);


  const getItemTitle = (itemId: string) => items.find(i => i.id === itemId)?.title || 'Unknown Item';
  const getCustomerName = (customerId: string) => customers.find(c => c.id === customerId)?.name || 'Unknown Customer';

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastSaleId = sales[sales.length - 1]?.id;
    try {
        const { sales: newSales, hasMore: newHasMore } = await getSalesPaginated({ userId, pageLimit: 5, lastVisibleId: lastSaleId });
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
      items: [{ itemId: '', quantity: 1, price: 0 }],
      date: new Date(),
      discountType: 'none',
      discountValue: 0,
      paymentMethod: 'Cash',
      amountPaid: 0,
      splitPaymentMethod: 'Cash',
      creditApplied: 0,
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
  const watchCustomerId = form.watch('customerId');
  
  const selectedCustomer = React.useMemo(() => customers.find(c => c.id === watchCustomerId), [customers, watchCustomerId]);
  const customerCredit = React.useMemo(() => (selectedCustomer && selectedCustomer.dueBalance < 0) ? Math.abs(selectedCustomer.dueBalance) : 0, [selectedCustomer]);

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
  
  const creditToApply = Math.min(total, customerCredit);
  
  const totalAfterCredit = total - creditToApply;

  React.useEffect(() => {
    form.setValue('creditApplied', creditToApply);
    if (totalAfterCredit <= 0) {
      form.setValue('paymentMethod', 'Paid by Credit');
    } else if (form.getValues('paymentMethod') === 'Paid by Credit') {
      form.setValue('paymentMethod', 'Cash');
    }
  }, [totalAfterCredit, creditToApply, form]);


  let dueAmount = 0;
  if (watchPaymentMethod === 'Due') {
    dueAmount = totalAfterCredit;
  } else if (watchPaymentMethod === 'Split') {
    dueAmount = totalAfterCredit - (watchAmountPaid || 0);
  }

  const handleAddNew = () => {
    const walkInCustomer = customers.find(c => c.name === 'Walk-in Customer');
    form.reset({
      customerId: walkInCustomer?.id || '',
      date: new Date(),
      items: [{ itemId: '', quantity: 1, price: 0 }],
      discountType: 'none',
      discountValue: 0,
      paymentMethod: 'Cash',
      amountPaid: 0,
      splitPaymentMethod: 'Cash',
      creditApplied: 0,
    });
    setCompletedSale(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (saleId: string) => {
    startTransition(async () => {
        const result = await deleteSale(userId, saleId);
        if (result.success) {
            toast({ title: 'Sale Deleted', description: 'The sale has been removed and stock restored.' });
            loadInitialData(); // Reload all data to ensure consistency
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to delete sale.' });
        }
    });
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setCompletedSale(null);
    }
    setIsDialogOpen(open);
  }

  const onSubmit = (data: SaleFormValues) => {
    startTransition(async () => {
      const saleData = {
        ...data,
        date: data.date.toISOString(),
      };
      const result = await addSale(userId, saleData);

      if (result?.success && result.sale) {
        toast({ title: 'Sale Recorded', description: 'The new sale has been added to the history.' });
        
        const newSale = result.sale;

        // Add the newly created sale to the local state to avoid a full refresh
        setSales(prev => [newSale, ...prev]);

        // Update local item stock
        const updatedItems = items.map(item => {
            const soldItem = newSale.items.find(saleItem => saleItem.itemId === item.id);
            if (soldItem) {
                return { ...item, stock: item.stock - soldItem.quantity };
            }
            return item;
        });
        setItems(updatedItems);
        
        loadInitialData(); // Reload customers to get updated balance

        setCompletedSale(newSale);

      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to record sale.' });
      }
    });
  };

  const getFilteredSales = async () => {
    if (!dateRange?.from) {
        toast({
            variant: "destructive",
            title: "Please select a start date.",
        });
        return null;
    }
    
    const allSales = await getSales(userId);
    const from = dateRange.from;
    const to = dateRange.to || dateRange.from;
    to.setHours(23, 59, 59, 999);

    return allSales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= from && saleDate <= to;
    });
  }
  
  const handleDownloadPdf = async () => {
    const filteredSales = await getFilteredSales();
    if (!filteredSales || !authUser) return;

    if (filteredSales.length === 0) {
      toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
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
    doc.text('Sales Report', 105, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`For the period: ${dateString}`, 105, 51, { align: 'center' });
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 60,
      head: [['Date', 'Sale ID', 'Customer', 'Items', 'Payment', 'Total']],
      body: filteredSales.map(sale => [
        format(new Date(sale.date), 'yyyy-MM-dd'),
        sale.saleId,
        getCustomerName(sale.customerId),
        sale.items.map(i => `${i.quantity}x ${getItemTitle(i.itemId)}`).join(', '),
        sale.paymentMethod,
        `BDT ${sale.total.toFixed(2)}`
      ]),
    });
    
    doc.save(`sales-report-${format(dateRange!.from!, 'yyyy-MM-dd')}-to-${format(dateRange!.to! || dateRange!.from!, 'yyyy-MM-dd')}.pdf`);
  };

  const handleDownloadXlsx = async () => {
    const filteredSales = await getFilteredSales();
    if (!filteredSales) return;

    if (filteredSales.length === 0) {
      toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
      return;
    }

    const dataToExport = filteredSales.map(sale => ({
      'Date': format(new Date(sale.date), 'yyyy-MM-dd'),
      'Sale ID': sale.saleId,
      'Customer': getCustomerName(sale.customerId),
              'Items': sale.items.map(i => `${i.quantity}x ${getItemTitle(i.itemId)}`).join('; '),
      'Payment Method': sale.paymentMethod,
      'Total': sale.total,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Auto-fit columns
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    XLSX.writeFile(workbook, `sales-report-${format(dateRange!.from!, 'yyyy-MM-dd')}-to-${format(dateRange!.to! || dateRange!.from!, 'yyyy-MM-dd')}.xlsx`);
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
                          <Button variant="outline" onClick={handleDownloadXlsx} disabled={!dateRange?.from}><FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel</Button>
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
                  <TableHead>Sale ID</TableHead>
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
                            <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : sales.length > 0 ? sales.map((sale) => {
                  const customer = customers.find(c => c.id === sale.customerId);
                  return (
                    <TableRow key={sale.id}>
                      <TableCell>{format(new Date(sale.date), 'PPP')}</TableCell>
                      <TableCell className="font-mono">{sale.saleId}</TableCell>
                      <TableCell className="font-medium">{customer?.name || 'Unknown Customer'}</TableCell>
                      <TableCell className="max-w-[300px]">
                        {sale.items.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span>
                                    {sale.items[0].quantity}x {getItemTitle(sale.items[0].itemId)}
                                </span>
                                {sale.items.length > 1 && (
                                    <SaleDetailsDialog sale={sale} items={items}>
                                        <Badge variant="secondary" className="cursor-pointer hover:bg-muted">
                                            +{sale.items.length - 1} more
                                        </Badge>
                                    </SaleDetailsDialog>
                                )}
                            </div>
                        )}
                      </TableCell>
                      <TableCell>{sale.paymentMethod}</TableCell>
                      <TableCell className="text-right font-medium">৳{sale.total.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {customer && authUser && (
                          <DownloadSaleMemo sale={sale} customer={customer} items={items} user={authUser} />
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(sale.id)} disabled={isPending}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                }) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No sales recorded yet.</TableCell>
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
          {completedSale && authUser ? (
             <SaleMemo sale={completedSale} customer={customers.find(c => c.id === completedSale.customerId)!} items={items} onNewSale={handleAddNew} user={authUser}/>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-headline">Record a New Sale</DialogTitle>
                <DialogDescription>Select a customer and books to create a new sale.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 p-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            {customerCredit > 0 && (
                                <p className="text-sm text-green-600 mt-2">
                                    Customer has ৳{customerCredit.toFixed(2)} credit available.
                                </p>
                            )}
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Sale Date</FormLabel>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                        "pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                        )}
                                    >
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date > new Date()}
                                    initialFocus
                                    />
                                </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <Separator />
                    <FormLabel>Items</FormLabel>
                    {fields.map((field, index) => {
                      const selectedItem = items.find(i => i.id === watchItems[index]?.itemId);
                      return (
                        <div key={field.id} className="flex gap-2 items-end p-3 border rounded-md relative">
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`items.${index}.itemId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Item</FormLabel>
                                  <Select onValueChange={(value) => {
                                    const item = items.find(i => i.id === value);
                                    field.onChange(value);
                                    form.setValue(`items.${index}.price`, item?.sellingPrice || 0);
                                  }} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select an item" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectPortal>
                                      <SelectContent>
                                                                        {items.map(item => (
                                  <SelectItem key={item.id} value={item.id} disabled={watchItems.some((i, itemIndex) => i.itemId === item.id && itemIndex !== index)}>
                                    {item.title}
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
                                <FormItem>
                                  <FormLabel className="text-xs">Quantity</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="1" max={selectedItem?.stock} placeholder="1" {...field} />
                                  </FormControl>
                                  {selectedItem && (
                                    <span className="text-xs text-muted-foreground">
                                      In stock: {selectedItem.stock}
                                    </span>
                                  )}
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
                                                onClick={() => append({ itemId: '', quantity: 1, price: 0 })}
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
                        <div className='flex gap-4 items-end'>
                            <FormField
                                control={form.control}
                                name="amountPaid"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Amount Paid Now</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="Enter amount paid" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="splitPaymentMethod"
                                render={({ field }) => (
                                    <FormItem className="flex-1 space-y-3">
                                    <FormLabel>Paid Via</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Cash" /></FormControl><FormLabel className="font-normal">Cash</FormLabel></FormItem>
                                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Bank" /></FormControl><FormLabel className="font-normal">Bank</FormLabel></FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}
                    <Separator />
                    <div className="space-y-2 text-sm pr-4">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>৳{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Discount</span>
                            <span>-৳{discountAmount.toFixed(2)}</span>
                        </div>
                        {creditToApply > 0 && (
                           <div className="flex justify-between text-green-600">
                                <span>Credit Applied</span>
                                <span>-৳{creditToApply.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-base border-t pt-2">
                            <span>Total</span>
                            <span>৳{totalAfterCredit.toFixed(2)}</span>
                        </div>
                        { (watchPaymentMethod === 'Due' || watchPaymentMethod === 'Split') && (
                            <div className="flex justify-between font-semibold text-destructive">
                                <span>Due Amount</span>
                                <span>৳{dueAmount.toFixed(2)}</span>
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

