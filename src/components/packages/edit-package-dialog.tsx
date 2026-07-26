'use client';

import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Gift, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { Item, PackageTemplate } from '@/lib/types';
import { packageFormSchema, type PackageFormValues } from './schema';

interface EditPackageDialogProps {
  packageTemplate: PackageTemplate;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  isPending: boolean;
  onSubmit: (packageId: string, data: PackageFormValues) => void;
}

export function EditPackageDialog({
  packageTemplate,
  isOpen,
  onOpenChange,
  items,
  isPending,
  onSubmit
}: EditPackageDialogProps) {
  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      name: packageTemplate.name,
      description: packageTemplate.description || '',
      items: packageTemplate.items || [{ itemId: '', quantity: 1 }],
      gifts: packageTemplate.gifts || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const { fields: giftFields, append: appendGift, remove: removeGift } = useFieldArray({
    control: form.control,
    name: 'gifts' as any,
  });

  const watchItems = form.watch('items');

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: packageTemplate.name,
        description: packageTemplate.description || '',
        items: packageTemplate.items || [{ itemId: '', quantity: 1 }],
        gifts: packageTemplate.gifts || [],
      });
    }
  }, [isOpen, packageTemplate, form]);

  const handleFormSubmit = (data: PackageFormValues) => {
    const cleanedGifts = (data.gifts || []).map(g => typeof g === 'string' ? g.trim() : '').filter(Boolean);
    onSubmit(packageTemplate.id, {
      ...data,
      gifts: cleanedGifts,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Package: {packageTemplate.name}</DialogTitle>
          <DialogDescription>Update books and included free gifts for this package template.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 p-1">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Summer Reading Bundle" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief details about the package" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />
              <FormLabel className="block font-semibold">Items Included</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-end p-3 border rounded-md relative bg-muted/20">
                  <div className="flex-1 grid grid-cols-[1fr_auto] gap-4">
                    <FormField
                      control={form.control}
                      name={`items.${index}.itemId`}
                      render={({ field: selectField }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Book</FormLabel>
                          <Select onValueChange={selectField.onChange} defaultValue={selectField.value}>
                            <FormControl>
                              <SelectTrigger>
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
                      render={({ field: inputField }) => (
                        <FormItem className="w-[100px]">
                          <FormLabel className="text-xs">Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" placeholder="1" {...inputField} />
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
                onClick={() => append({ itemId: '', quantity: 1 })}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Book
              </Button>

              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <FormLabel className="font-semibold flex items-center gap-1.5 text-primary">
                      <Gift className="h-4 w-4" /> Gifts Included (Optional)
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Gifts will be listed in package details & sales memos, but will <strong className="text-foreground">NOT</strong> deduct from inventory stock.
                    </p>
                  </div>
                </div>

                {giftFields.map((giftField, index) => (
                  <div key={giftField.id} className="flex gap-2 items-center">
                    <FormField
                      control={form.control}
                      name={`gifts.${index}` as any}
                      render={({ field: giftInputProps }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="e.g., Free Pen, Bookmark, Calendar..." {...giftInputProps} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => removeGift(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendGift('' as any)}
                  className="mt-1"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Gift Item
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Package Template
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
