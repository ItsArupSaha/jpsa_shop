'use client';

import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectPortal,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { addSale } from '@/lib/actions';
import type { Customer, Item, Sale } from '@/lib/types';
import { SaleMemo } from '../sale-memo';
import { cn } from '@/lib/utils';

import { saleFormSchema, type SaleFormValues } from './schema';
import { SaleItemRow } from './sale-item-row';
import { SalePaymentSection } from './sale-payment-section';
import { SaleSummarySection } from './sale-summary-section';

interface RecordSaleDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  customers: Customer[];
  onSuccess: () => void;
  authUser: any;
}

export function RecordSaleDialog({
  userId,
  isOpen,
  onOpenChange,
  items,
  customers,
  onSuccess,
  authUser,
}: RecordSaleDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [completedSale, setCompletedSale] = React.useState<Sale | null>(null);

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
  const watchCustomerId = form.watch('customerId');

  const selectedCustomer = React.useMemo(() => customers.find(c => c.id === watchCustomerId), [customers, watchCustomerId]);
  const customerCredit = React.useMemo(() => (selectedCustomer && selectedCustomer.dueBalance < 0) ? Math.abs(selectedCustomer.dueBalance) : 0, [selectedCustomer]);

  React.useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen, customers, form]);

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
  };

  const onSubmit = (data: SaleFormValues) => {
    startTransition(async () => {
      try {
        const saleData = {
          ...data,
          date: data.date.toISOString(),
        };
        const result = await addSale(userId, saleData);

        if (result?.success && result.sale) {
          toast({ title: 'Sale Recorded', description: 'The new sale has been added to the history.' });
          setCompletedSale(result.sale);
          onSuccess();
        } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to record sale.' });
        }
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to record sale.' });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setCompletedSale(null);
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-2xl">
        {completedSale && authUser ? (
          <SaleMemo
            sale={completedSale}
            customer={customers.find(c => c.id === completedSale.customerId)!}
            items={items}
            onNewSale={handleAddNew}
            user={authUser}
          />
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
                          <Select onValueChange={field.onChange} value={field.value || ''}>
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
                  <FormLabel>Items</FormLabel>
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <SaleItemRow
                        key={field.id}
                        index={index}
                        items={items}
                        watchItems={watchItems}
                        onRemove={() => remove(index)}
                        disabledRemove={fields.length === 1}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ itemId: '', quantity: 1, price: 0 })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                  </Button>
                  <Separator />
                  <SalePaymentSection />
                  <Separator />
                  <SaleSummarySection customerCredit={customerCredit} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending || !form.formState.isValid}>
                    {isPending ? "Confirming..." : "Confirm Sale"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
