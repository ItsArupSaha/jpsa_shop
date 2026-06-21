'use client';

import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { addPurchase } from '@/lib/actions';
import type { Category } from '@/lib/types';

import { purchaseFormSchema, type PurchaseFormValues } from './schema';
import { PurchaseItemRow } from './purchase-item-row';
import { PurchasePaymentSection } from './purchase-payment-section';
import { PurchaseSummarySection } from './purchase-summary-section';

interface RecordPurchaseDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onSuccess: () => void;
  onAddCategoryClick: () => void;
}

export function RecordPurchaseDialog({
  userId,
  isOpen,
  onOpenChange,
  categories,
  onSuccess,
  onAddCategoryClick,
}: RecordPurchaseDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplier: '',
      items: [{ itemName: '', categoryId: '', categoryName: '', author: '', medicineGroup: '', company: '', expiryDate: '', quantity: 1, cost: 0, sellingPrice: 0 }],
      discountType: 'amount',
      discountValue: 0,
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

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        supplier: '',
        items: [{ itemName: '', categoryId: '', categoryName: '', author: '', medicineGroup: '', company: '', expiryDate: '', quantity: 1, cost: 0, sellingPrice: 0 }],
        discountType: 'amount',
        discountValue: 0,
        paymentMethod: 'Due',
        amountPaid: 0,
        splitPaymentMethod: 'Cash',
        dueDate: new Date(),
      });
    }
  }, [isOpen, form]);

  const onSubmit = (data: PurchaseFormValues) => {
    startTransition(async () => {
      try {
        const calculatedTotal = data.items.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
        const calculatedDiscount = data.discountType === 'percentage' 
            ? (calculatedTotal * (data.discountValue || 0)) / 100 
            : (data.discountValue || 0);

        const purchaseData = {
          ...data,
          discountAmount: calculatedDiscount,
          dueDate: data.dueDate.toISOString()
        };
        
        // @ts-ignore
        delete purchaseData.discountType;
        // @ts-ignore
        delete purchaseData.discountValue;

        const result = await addPurchase(userId, purchaseData);
        if (result?.success) {
          toast({ title: 'Purchase Recorded', description: 'The new purchase has been added and stock updated.' });
          onSuccess();
          onOpenChange(false);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to record purchase.' });
        }
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save the purchase.' });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Record New Purchase</DialogTitle>
          <DialogDescription>Enter supplier details and the items purchased. New items will be created automatically.</DialogDescription>
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
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <PurchaseItemRow
                      key={field.id}
                      index={index}
                      categories={categories}
                      onAddCategoryClick={onAddCategoryClick}
                      onRemove={() => remove(index)}
                      disabledRemove={fields.length === 1}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ itemName: '', categoryId: '', categoryName: '', author: '', medicineGroup: '', company: '', expiryDate: '', quantity: 1, cost: 0, sellingPrice: 0 })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
                
                <Separator />
                <PurchasePaymentSection />
              </div>
            </div>
            
            <div className="mt-auto pt-4 space-y-4 border-t px-6 pb-6 bg-background">
              <PurchaseSummarySection />
              <DialogFooter>
                <Button type="submit" disabled={isPending || !form.formState.isValid}>
                  {isPending ? "Saving..." : "Confirm Purchase"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
