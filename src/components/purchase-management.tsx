
'use client';

import { addPurchase, getPurchasesPaginated, getPurchases } from '@/lib/actions';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FileSpreadsheet, FileText, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Purchase } from '@/lib/types';
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { useAuth } from '@/hooks/use-auth';

const purchaseItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  category: z.enum(['Book', 'Office Asset'], { required_error: 'Category is required' }),
  author: z.string().optional(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  cost: z.coerce.number().min(0, 'Cost must be non-negative'),
}).refine(data => {
    if (data.category === 'Book') {
        return !!data.author && data.author.length > 0;
    }
    return true;
}, {
    message: "Author is required for books.",
    path: ['author'],
});

const purchaseFormSchema = z.object({
  supplier: z.string().min(1, 'Supplier is required'),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required.'),
  paymentMethod: z.enum(['Cash', 'Bank', 'Due', 'Split'], { required_error: 'Payment method is required.'}),
  amountPaid: z.coerce.number().optional(),
  splitPaymentMethod: z.enum(['Cash', 'Bank']).optional(),
  dueDate: z.date({ required_error: "A due date is required." }),
}).refine(data => {
    if (data.paymentMethod === 'Split') {
        return data.amountPaid !== undefined && data.amountPaid > 0 && !!data.splitPaymentMethod;
    }
    return true;
}, {
    message: "Amount paid and its method are required for split payments.",
    path: ['amountPaid'],
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

interface PurchaseManagementProps {
    userId: string;
}

export default function PurchaseManagement({ userId }: PurchaseManagementProps) {
  const { authUser } = useAuth();
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const { purchases: newPurchases, hasMore: newHasMore } = await getPurchasesPaginated({ userId, pageLimit: 10 });
      setPurchases(newPurchases);
      setHasMore(newHasMore);
    } catch (error) {
       toast({ variant: "destructive", title: "Error", description: "Failed to load purchases." });
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
    const lastPurchaseId = purchases[purchases.length - 1]?.id;
    try {
      const { purchases: newPurchases, hasMore: newHasMore } = await getPurchasesPaginated({ userId, pageLimit: 10, lastVisibleId: lastPurchaseId });
      setPurchases(prev => [...prev, ...newPurchases]);
      setHasMore(newHasMore);
    } catch (error) {
       toast({ variant: "destructive", title: "Error", description: "Failed to load more purchases." });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplier: '',
      items: [{ itemName: '', category: 'Book', author: '', quantity: 1, cost: 0 }],
      paymentMethod: 'Due',
      amountPaid: 0,
      splitPaymentMethod: 'Cash',
      dueDate: new Date(),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const watchItems = form.watch('items');
  const watchPaymentMethod = form.watch('paymentMethod');
  const watchAmountPaid = form.watch('amountPaid');

  const totalAmount = watchItems.reduce((acc, item) => {
    const cost = item.cost || 0;
    const quantity = Number(item.quantity) || 0;
    return acc + (cost * quantity);
  }, 0);

  let dueAmount = 0;
  if (watchPaymentMethod === 'Due') {
    dueAmount = totalAmount;
  } else if (watchPaymentMethod === 'Split') {
    dueAmount = totalAmount - (watchAmountPaid || 0);
  }

  const handleAddNew = () => {
    form.reset({
      supplier: '',
      items: [{ itemName: '', category: 'Book', author: '', quantity: 1, cost: 0 }],
      paymentMethod: 'Due',
      amountPaid: 0,
      splitPaymentMethod: 'Cash',
      dueDate: new Date(),
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: PurchaseFormValues) => {
    startTransition(async () => {
      const purchaseData = {
        ...data,
        dueDate: data.dueDate.toISOString()
      };
      const result = await addPurchase(userId, purchaseData);
      if (result?.success) {
        toast({ title: 'Purchase Recorded', description: 'The new purchase has been added and stock updated.' });
        loadInitialData();
        setIsDialogOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to record purchase.' });
      }
    });
  };

  const getFilteredPurchases = async () => {
    if (!dateRange?.from) {
        toast({ variant: "destructive", title: "Please select a start date." });
        return null;
    }
    
    const allPurchases = await getPurchases(userId);
    const from = dateRange.from;
    const to = dateRange.to || dateRange.from;
    to.setHours(23, 59, 59, 999);
    return allPurchases.filter(p => {
      const pDate = new Date(p.date);
      return pDate >= from && pDate <= to;
    });
  }

  const handleDownloadPdf = async () => {
    const filteredPurchases = await getFilteredPurchases();
    if (!filteredPurchases || !authUser) return;
    if (filteredPurchases.length === 0) {
      toast({ title: 'No Purchases Found', description: 'There are no purchases in the selected date range.' });
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
    doc.text('Purchases Report', 105, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`For the period: ${dateString}`, 105, 51, { align: 'center' });
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 60,
      head: [['Date', 'Purchase ID', 'Supplier', 'Items', 'Total']],
      body: filteredPurchases.map(p => [
        format(new Date(p.date), 'yyyy-MM-dd'),
        p.purchaseId,
        p.supplier,
        p.items.map(i => `${i.quantity}x ${i.itemName}`).join(', '),
        `$${p.totalAmount.toFixed(2)}`
      ]),
    });
    doc.save(`purchases-report-${format(dateRange!.from!, 'yyyy-MM-dd')}.pdf`);
  };

  const handleDownloadCsv = async () => {
    const filteredPurchases = await getFilteredPurchases();
    if (!filteredPurchases) return;
    if (filteredPurchases.length === 0) {
      toast({ title: 'No Purchases Found', description: 'There are no purchases in the selected date range.' });
      return;
    }
    const csvData = filteredPurchases.flatMap(p => 
      p.items.map(i => ({
        'Date': format(new Date(p.date), 'yyyy-MM-dd'),
        'Purchase ID': p.purchaseId,
        'Supplier': p.supplier,
        'Item Name': i.itemName,
        'Category': i.category,
        'Author': i.author || '',
        'Quantity': i.quantity,
        'Unit Cost': i.cost,
        'Total Cost': i.quantity * i.cost,
        'Grand Total': p.totalAmount,
      }))
    );
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `purchases-report-${format(dateRange!.from!, 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <div className="flex flex-col items-end gap-2">
                <Button onClick={handleAddNew}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Record New Purchase
                </Button>
                <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" /> Download Reports
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Download Purchase Report</DialogTitle>
                            <DialogDescription>Select a date range to download your purchase data.</DialogDescription>
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
                            <Button variant="outline" onClick={handleDownloadPdf} disabled={!dateRange?.from}><FileText className="mr-2 h-4 w-4" /> PDF</Button>
                            <Button variant="outline" onClick={handleDownloadCsv} disabled={!dateRange?.from}><FileSpreadsheet className="mr-2 h-4 w-4" /> CSV</Button>
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
                  <TableHead>Purchase ID</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isInitialLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : purchases.length > 0 ? purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>{format(new Date(purchase.date), 'PPP')}</TableCell>
                    <TableCell className="font-mono">{purchase.purchaseId}</TableCell>
                    <TableCell className="font-medium">{purchase.supplier}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {purchase.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ')}
                    </TableCell>
                    <TableCell>{purchase.paymentMethod}</TableCell>
                    <TableCell className="text-right font-medium">${purchase.totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No purchases recorded yet.</TableCell>
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-headline">Record New Purchase</DialogTitle>
            <DialogDescription>Enter supplier details and the items purchased. New books will be created automatically.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-4 pl-1 -mr-4 -ml-1 py-4">
                 <div className="space-y-4 px-4">
                    <FormField
                        control={form.control}
                        name="supplier"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Supplier Name</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., Global Publishing House" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Separator />
                    
                    <FormLabel>Items</FormLabel>
                    <div className="space-y-3 pr-2">
                        {fields.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-start p-3 border rounded-md relative">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.itemName`}
                                    render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel className="text-xs">Item Name</FormLabel>
                                        <FormControl><Input placeholder="e.g., The Midnight Library" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.category`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Category</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Book">Book</SelectItem>
                                            <SelectItem value="Office Asset">Office Asset</SelectItem>
                                        </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                {watchItems[index]?.category === 'Book' && (
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.author`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Author</FormLabel>
                                            <FormControl><Input placeholder="e.g., Matt Haig" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                />
                                )}
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.quantity`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Qty</FormLabel>
                                        <FormControl><Input type="number" min="1" placeholder="1" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.cost`}
                                    render={({ field }) => (
                                    <FormItem className={watchItems[index]?.category !== 'Book' ? 'md:col-start-4' : ''}>
                                        <FormLabel className="text-xs">Unit Cost</FormLabel>
                                        <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                            <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 mt-6"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                            >
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        ))}
                    </div>
                    <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ itemName: '', category: 'Book', author: '', quantity: 1, cost: 0 })}
                    >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                    
                     <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <FormControl><RadioGroupItem value="Cash" id="cash-pur" /></FormControl>
                                    <FormLabel htmlFor="cash-pur" className="font-normal">Cash</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl><RadioGroupItem value="Bank" id="bank-pur" /></FormControl>
                                    <FormLabel htmlFor="bank-pur" className="font-normal">Bank</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl><RadioGroupItem value="Due" id="due-pur" /></FormControl>
                                    <FormLabel htmlFor="due-pur" className="font-normal">Due</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl><RadioGroupItem value="Split" id="split-pur" /></FormControl>
                                    <FormLabel htmlFor="split-pur" className="font-normal">Split</FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {watchPaymentMethod === 'Split' && (
                            <div className='space-y-2'>
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
                              <FormField
                                control={form.control}
                                name="splitPaymentMethod"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                    <FormLabel className="text-sm">Paid Via</FormLabel>
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
                        <FormField
                          control={form.control}
                          name="dueDate"
                          render={({ field }) => (
                          <FormItem className="flex flex-col">
                              <FormLabel>Payment Due Date</FormLabel>
                              <Popover>
                                  <PopoverTrigger asChild>
                                  <FormControl>
                                      <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                  </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                                  </PopoverContent>
                              </Popover>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                    </div>
                </div>
              </div>
              
              <div className="mt-auto pt-4 space-y-4 border-t px-6 pb-6">
                  <div className="space-y-2 text-sm">
                      <div className="flex justify-between font-bold text-base">
                          <span>Total Amount</span>
                          <span>${totalAmount.toFixed(2)}</span>
                      </div>
                      { (watchPaymentMethod === 'Due' || watchPaymentMethod === 'Split') && (
                          <div className="flex justify-between font-semibold text-destructive">
                              <span>Due Amount</span>
                              <span>${dueAmount.toFixed(2)}</span>
                          </div>
                      )}
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isPending || totalAmount <= 0 || !form.formState.isValid}>
                      {isPending ? "Saving..." : "Confirm Purchase"}
                    </Button>
                  </DialogFooter>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
