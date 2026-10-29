'use client';

import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle } from 'lucide-react';

import { DateField } from '@/components/date-field';
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
import { addPurchase, updatePurchase } from '@/lib/actions';
import type { Category, Item, Purchase } from '@/lib/types';
import type { PurchaseSettlementSummary } from '@/lib/db/purchases';
import { formatTaka } from '@/lib/format';

import { purchaseFormSchema, type PurchaseFormValues } from './schema';
import { PurchaseItemRow } from './purchase-item-row';
import { PurchasePaymentSection } from './purchase-payment-section';
import { PurchaseSummarySection } from './purchase-summary-section';

interface RecordPurchaseDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  items: Item[];
  onSuccess: () => void;
  onAddCategoryClick: () => void;
  editingPurchase?: Purchase | null;
  settlement?: PurchaseSettlementSummary | null;
}

const emptyItemRow = { itemId: undefined, itemName: '', categoryId: '', categoryName: '', author: '', quantity: 1, cost: 0, sellingPrice: 0 };

const getEmptyFormValues = (): PurchaseFormValues => ({
  supplier: '',
  date: new Date(),
  items: [{ ...emptyItemRow }],
  discountType: 'amount',
  discountValue: 0,
  paymentMethod: 'Due',
  amountPaid: 0,
  splitPaymentMethod: 'Cash',
  dueDate: new Date(),
});

export function RecordPurchaseDialog({
  userId,
  isOpen,
  onOpenChange,
  categories,
  items,
  onSuccess,
  onAddCategoryClick,
  editingPurchase,
  settlement,
}: RecordPurchaseDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  // Once money has moved against this purchase's payable, the payment facts
  // are locked; updatePurchase enforces the same restriction server-side and
  // recalculates the outstanding balance from the new total.
  const paymentLocked = !!editingPurchase && !!settlement?.hasSettlement;

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: getEmptyFormValues(),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  React.useEffect(() => {
    if (isOpen) {
      if (editingPurchase) {
        form.reset({
          supplier: editingPurchase.supplier,
          date: new Date(editingPurchase.date),
          items: editingPurchase.items.map(i => ({
            itemId: i.itemId,
            itemName: i.itemName,
            categoryId: i.categoryId,
            categoryName: i.categoryName,
            author: i.author || '',
            quantity: i.quantity,
            cost: i.cost,
            sellingPrice: i.sellingPrice ?? 0,
          })),
          // The stored discount is an amount, so edits continue from that amount.
          discountType: 'amount',
          discountValue: editingPurchase.discountAmount || 0,
          paymentMethod: editingPurchase.paymentMethod === 'N/A' ? 'Due' : editingPurchase.paymentMethod,
          amountPaid: editingPurchase.amountPaid || 0,
          splitPaymentMethod: editingPurchase.splitPaymentMethod || 'Cash',
          dueDate: new Date(editingPurchase.dueDate),
        });
      } else {
        form.reset(getEmptyFormValues());
      }
    }
  }, [isOpen, editingPurchase, form]);

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
          date: data.date.toISOString(),
          dueDate: data.dueDate.toISOString()
        };

        // @ts-ignore
        delete purchaseData.discountType;
        // @ts-ignore
        delete purchaseData.discountValue;

        const result = editingPurchase
          ? await updatePurchase(userId, editingPurchase.id, purchaseData)
          : await addPurchase(userId, purchaseData);
        if (result?.success) {
          toast(
            editingPurchase
              ? { title: 'Purchase Updated', description: `${editingPurchase.purchaseId} has been updated; stock, expenses, and payables were adjusted.` }
              : { title: 'Purchase Recorded', description: 'The new purchase has been added and stock updated.' }
          );
          onSuccess();
          onOpenChange(false);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: result?.error || 'Failed to save the purchase.' });
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
          <DialogTitle className="font-headline">
            {editingPurchase ? `Edit Purchase ${editingPurchase.purchaseId}` : 'Record New Purchase'}
          </DialogTitle>
          <DialogDescription>
            {editingPurchase
              ? 'Update the purchase. Stock, expenses, and payables will be adjusted to match.'
              : 'Enter supplier details and the items purchased. New items will be created automatically.'}
          </DialogDescription>
        </DialogHeader>
        {paymentLocked && settlement && (
          <div className="mx-6 rounded-md border border-amber-600/50 bg-amber-500/10 px-4 py-3 text-sm">
            <p className="font-medium">
              {formatTaka((settlement.initialPaidAmount + settlement.laterPaidAmount).toFixed(2))} has already been paid for this purchase
              ({formatTaka(settlement.initialPaidAmount.toFixed(2))} at purchase + {formatTaka(settlement.laterPaidAmount.toFixed(2))} in later payments).
            </p>
            <p className="text-muted-foreground">
              Payment fields are locked. Items, discount, and total stay editable — saving recalculates the outstanding balance from the new total.
            </p>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-4 pl-1 -mr-4 -ml-1 py-4">
              <div className="space-y-4 px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Purchase Date</FormLabel>
                        <FormControl>
                          <DateField
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Pick a date"
                            aria-label="Purchase date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Separator />

                <FormLabel>Items</FormLabel>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <PurchaseItemRow
                      key={field.id}
                      index={index}
                      categories={categories}
                      items={items}
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
                  onClick={() => append({ ...emptyItemRow })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>

                <Separator />
                <PurchasePaymentSection locked={paymentLocked} />
              </div>
            </div>

            <div className="mt-auto pt-4 space-y-4 border-t px-6 pb-6 bg-background">
              <PurchaseSummarySection />
              <DialogFooter>
                <Button type="submit" disabled={isPending || !form.formState.isValid}>
                  {isPending ? "Saving..." : editingPurchase ? "Save Changes" : "Confirm Purchase"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

