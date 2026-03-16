'use client';

import { addSale, getCustomers } from '@/lib/actions';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, PlusCircle, ShoppingCart, Trash2 } from 'lucide-react';
import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Customer, Item, PackageTemplate } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DownloadSaleMemo } from './download-sale-memo';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const saleItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
});

const saleFormSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  date: z.date({ required_error: "A sale date is required." }),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  discountType: z.enum(['none', 'percentage', 'amount']),
  discountValue: z.coerce.number().min(0, 'Discount must be non-negative').default(0),
  paymentMethod: z.enum(['Cash', 'Bank', 'Due', 'Split', 'Paid by Credit'], { required_error: 'Payment method is required.' }),
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

interface PackageSaleDialogProps {
  packageTemplate: PackageTemplate;
  items: Item[];
  userId: string;
  onSaleComplete: () => void;
}

export function PackageSaleDialog({ packageTemplate, items, userId, onSaleComplete }: PackageSaleDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const { authUser } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [completedSale, setCompletedSale] = React.useState<any | null>(null);

  // Load customers when dialog opens
  React.useEffect(() => {
    if (isOpen && customers.length === 0) {
      getCustomers(userId).then(setCustomers).catch(console.error);
    }
  }, [isOpen, userId, customers.length]);

  // Map package items to actual items to get prices
  const prefilledItems = packageTemplate.items.map(pkgItem => {
    const fullItem = items.find(i => i.id === pkgItem.itemId);
    return {
      itemId: pkgItem.itemId,
      quantity: pkgItem.quantity,
      price: fullItem?.sellingPrice || 0,
      title: fullItem?.title || 'Unknown Item',
      stock: fullItem?.stock || 0
    };
  });

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      customerId: '',
      date: new Date(),
      items: prefilledItems.map(item => ({ itemId: item.itemId, quantity: item.quantity })),
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
  const watchCustomerId = form.watch('customerId');
  const watchAmountPaid = form.watch('amountPaid');

  const selectedCustomer = React.useMemo(() => customers.find(c => c.id === watchCustomerId), [customers, watchCustomerId]);
  const customerCredit = React.useMemo(() => (selectedCustomer && selectedCustomer.dueBalance < 0) ? Math.abs(selectedCustomer.dueBalance) : 0, [selectedCustomer]);

  // Dynamically calculate subtotal based on form state
  let subtotal = 0;
  let hasOutOfStock = false;
  const currentItemsDetails = watchItems.map(formItem => {
      const fullItem = items.find(i => i.id === formItem.itemId);
      const price = fullItem?.sellingPrice || 0;
      const stock = fullItem?.stock || 0;
      subtotal += price * formItem.quantity;
      if (stock < formItem.quantity) hasOutOfStock = true;
      return { ...formItem, price, stock, title: fullItem?.title || 'Unknown Item' };
  });

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
    if (totalAfterCredit <= 0 && watchPaymentMethod !== 'Paid by Credit') {
      form.setValue('paymentMethod', 'Paid by Credit');
    } else if (totalAfterCredit > 0 && form.getValues('paymentMethod') === 'Paid by Credit') {
      form.setValue('paymentMethod', 'Cash');
    }
  }, [totalAfterCredit, creditToApply, form, watchPaymentMethod]);

  // Removed handleApplyOfferedPriceDiff

  const onSubmit = (data: SaleFormValues) => {
    // Check stock before submitting
    if (hasOutOfStock) {
      toast({
        variant: 'destructive',
        title: 'Out of Stock',
        description: `Not enough stock for one or more items.`,
      });
      return;
    }

    startTransition(async () => {
      const saleData = {
        ...data,
        date: data.date.toISOString(),
        items: currentItemsDetails.map(i => ({ itemId: i.itemId, quantity: i.quantity, price: i.price }))
      };
      
      const result = await addSale(userId, saleData);

      if (result.success && result.sale) {
        toast({ title: 'Package Sold!', description: 'The sale was successfully recorded.' });
        setCompletedSale(result.sale);
        onSaleComplete();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to record sale.' });
      }
    });
  };

  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen) {
      setCompletedSale(null);
      form.reset();
    }
    setIsOpen(newOpen);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="gap-2">
          <ShoppingCart className="h-4 w-4" /> Sell Now
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl flex items-center gap-2">
            Sell Package: {packageTemplate.name}
          </DialogTitle>
          <DialogDescription>
            The items and quantities are pre-loaded from the package template.
          </DialogDescription>
        </DialogHeader>

        {completedSale && authUser ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-green-600">Sale Completed!</h3>
            <p className="text-center text-muted-foreground">
              Package "{packageTemplate.name}" was successfully sold to {customers.find(c => c.id === completedSale.customerId)?.name || 'Customer'}.
            </p>
            <div className="pt-4 flex gap-4">
              <DownloadSaleMemo sale={completedSale} customer={customers.find(c => c.id === completedSale.customerId)!} items={items} user={authUser} />
              <Button onClick={() => setIsOpen(false)} variant="outline">Close Dialog</Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-4">
                
                {/* Pre-filled Items Summary */}
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <h4 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">Package Contents</h4>
                  <div className="space-y-3">
                    {fields.map((field, index) => {
                      const selectedItemId = watchItems[index]?.itemId;
                      const currentItem = items.find(i => i.id === selectedItemId);
                      const price = currentItem?.sellingPrice || 0;
                      const stock = currentItem?.stock || 0;
                      const qty = watchItems[index]?.quantity || 0;
                      
                      return (
                        <div key={field.id} className="flex gap-2 items-end">
                            <div className="flex-1 grid grid-cols-[1fr_80px_100px] gap-2 items-end">
                              <FormField
                                control={form.control}
                                name={`items.${index}.itemId`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="h-8 text-sm">
                                          <SelectValue placeholder="Select a book" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectPortal>
                                        <SelectContent className="max-h-60 overflow-y-auto">
                                          {items.map(item => (
                                            <SelectItem
                                              key={item.id}
                                              value={item.id}
                                              disabled={watchItems.some((i, itemIndex) => i.itemId === item.id && itemIndex !== index)}
                                            >
                                              {item.title} (In Stock: {item.stock})
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
                                    <FormControl>
                                      <Input className="h-8 text-sm px-2 text-center" type="number" min="1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex flex-col items-end justify-center h-8">
                                {stock < qty ? (
                                    <span className="text-[10px] text-destructive font-semibold tracking-tight uppercase leading-none mb-1">Stock: {stock}</span>
                                ) : null}
                                <span className="text-sm font-medium tabular-nums">৳{(price * qty).toFixed(2)}</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={() => remove(index)}
                              disabled={fields.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="p-0 h-auto mt-2 text-xs"
                    onClick={() => append({ itemId: '', quantity: 1 })}
                  >
                    <PlusCircle className="mr-1 h-3 w-3" /> Add Item
                  </Button>
                  <Separator className="my-3" />
                  <div className="flex justify-between items-center font-semibold">
                    <span>Subtotal</span>
                    <span className="tabular-nums">৳{subtotal.toFixed(2)}</span>
                  </div>
                </div>

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
                            <SelectContent className="max-h-60 overflow-y-auto">
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <FormLabel>Manual Discount</FormLabel>
                    </div>
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="discountType"
                        render={({ field }) => (
                          <FormItem className="w-1/3">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectPortal>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="percentage">%</SelectItem>
                                  <SelectItem value="amount">৳</SelectItem>
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
                          <FormItem className={cn("w-2/3", watchDiscountType === 'none' && 'opacity-50 pointer-events-none')}>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0" {...field} />
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
                      <FormItem className="space-y-3">
                        <FormLabel>Payment Method</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-wrap gap-4"
                          >
                            <FormItem className="flex items-center space-x-2">
                              <FormControl><RadioGroupItem value="Cash" id="cash-pkg" /></FormControl>
                              <FormLabel htmlFor="cash-pkg" className="font-normal cursor-pointer">Cash</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2">
                              <FormControl><RadioGroupItem value="Bank" id="bank-pkg" /></FormControl>
                              <FormLabel htmlFor="bank-pkg" className="font-normal cursor-pointer">Bank</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2">
                              <FormControl><RadioGroupItem value="Due" id="due-pkg" /></FormControl>
                              <FormLabel htmlFor="due-pkg" className="font-normal cursor-pointer">Due</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2">
                              <FormControl><RadioGroupItem value="Split" id="split-pkg" /></FormControl>
                              <FormLabel htmlFor="split-pkg" className="font-normal cursor-pointer">Split</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {watchPaymentMethod === 'Split' && (
                  <div className='flex gap-4 items-end bg-accent/20 p-4 rounded-md border'>
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
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex gap-4"
                            >
                              <FormItem className="flex items-center space-x-2">
                                <FormControl><RadioGroupItem value="Cash" id="split-cash-pkg" /></FormControl>
                                <FormLabel htmlFor="split-cash-pkg" className="font-normal cursor-pointer">Cash</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2">
                                <FormControl><RadioGroupItem value="Bank" id="split-bank-pkg" /></FormControl>
                                <FormLabel htmlFor="split-bank-pkg" className="font-normal cursor-pointer">Bank</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Total Callout */}
              <div className="bg-primary/5 text-primary border border-primary/20 p-4 rounded-xl flex justify-between items-center shadow-inner mt-4">
                <div>
                    <p className="text-sm font-medium opacity-80">Final Total</p>
                    <p className="text-3xl font-bold tracking-tight">৳{totalAfterCredit.toFixed(2)}</p>
                </div>
                <Button type="submit" size="lg" className="font-semibold shadow-md" disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
                  Confirm Sale
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
