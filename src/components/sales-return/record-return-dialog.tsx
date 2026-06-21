'use client';

import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { Customer, Item } from '@/lib/types';
import { salesReturnFormSchema, type SalesReturnFormValues } from './schema';

interface RecordReturnDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  customers: Customer[];
  isPending: boolean;
  onSubmit: (data: SalesReturnFormValues) => void;
}

export function RecordReturnDialog({
  isOpen,
  onOpenChange,
  items,
  customers,
  isPending,
  onSubmit
}: RecordReturnDialogProps) {
  const form = useForm<SalesReturnFormValues>({
    resolver: zodResolver(salesReturnFormSchema),
    defaultValues: {
      customerId: '',
      items: [{ itemId: '', quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');

  const totalReturnValue = watchItems.reduce((acc, item) => {
    const price = item.price || 0;
    const quantity = Number(item.quantity) || 0;
    return acc + (price * quantity);
  }, 0);

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        customerId: '',
        items: [{ itemId: '', quantity: 1, price: 0 }],
      });
    }
  }, [isOpen, form]);

  const handleFormSubmit = (data: SalesReturnFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Record a Sales Return</DialogTitle>
          <DialogDescription>
            Select the customer and items being returned. The value will be credited to their account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 p-1">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger></FormControl>
                      <SelectPortal><SelectContent>
                        {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent></SelectPortal>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Separator />
              <FormLabel>Returned Items</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-end p-3 border rounded-md relative bg-muted/10">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.itemId`}
                      render={({ field: selectField }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-xs">Item</FormLabel>
                          <Select onValueChange={(value) => {
                            const item = items.find(i => i.id === value);
                            selectField.onChange(value);
                            form.setValue(`items.${index}.price`, item?.sellingPrice || 0);
                          }} defaultValue={selectField.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger></FormControl>
                            <SelectPortal><SelectContent>
                              {items.map(item => (
                                <SelectItem key={item.id} value={item.id} disabled={watchItems.some((i, itemIndex) => i.itemId === item.id && itemIndex !== index)}>
                                  {item.title}
                                </SelectItem>
                              ))}
                            </SelectContent></SelectPortal>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field: inputField }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Quantity</FormLabel>
                          <FormControl><Input type="number" min="1" placeholder="1" {...inputField} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => remove(index)} disabled={fields.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ itemId: '', quantity: 1, price: 0 })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
              </Button>
              <Separator />
              <div className="flex justify-between font-bold text-base pr-4">
                <span>Total Return Credit</span>
                <span>৳{totalReturnValue.toFixed(2)}</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending || totalReturnValue <= 0 || !form.formState.isValid}>
                {isPending ? "Recording..." : "Record Return"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
