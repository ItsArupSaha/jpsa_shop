'use client';

import * as React from 'react';
import { Control, UseFieldArrayAppend, UseFieldArrayRemove } from 'react-hook-form';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { Item } from '@/lib/types';
import type { SaleFormValues } from './schema';

interface PackageSaleItemsSummaryProps {
  control: Control<SaleFormValues>;
  watchItems: { itemId: string; quantity: number }[];
  fields: Record<string, any>[];
  append: UseFieldArrayAppend<SaleFormValues, 'items'>;
  remove: UseFieldArrayRemove;
  items: Item[];
  subtotal: number;
}

export function PackageSaleItemsSummary({
  control,
  watchItems,
  fields,
  append,
  remove,
  items,
  subtotal
}: PackageSaleItemsSummaryProps) {
  return (
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
                  control={control}
                  name={`items.${index}.itemId`}
                  render={({ field: selectField }) => (
                    <FormItem>
                      <Select onValueChange={selectField.onChange} defaultValue={selectField.value}>
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
                  control={control}
                  name={`items.${index}.quantity`}
                  render={({ field: inputField }) => (
                    <FormItem>
                      <FormControl>
                        <Input className="h-8 text-sm px-2 text-center" type="number" min="1" {...inputField} />
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
  );
}
