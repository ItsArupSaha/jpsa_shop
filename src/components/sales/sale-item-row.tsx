'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { Item } from '@/lib/types';

interface SaleItemRowProps {
  index: number;
  items: Item[];
  watchItems: any[];
  onRemove: () => void;
  disabledRemove: boolean;
}

export function SaleItemRow({
  index,
  items,
  watchItems,
  onRemove,
  disabledRemove,
}: SaleItemRowProps) {
  const { control, setValue } = useFormContext();
  const watchItemId = watchItems[index]?.itemId;
  const selectedItem = items.find(i => i.id === watchItemId);

  return (
    <div className="flex gap-2 items-end p-3 border rounded-md relative">
      <div className="flex-1 grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name={`items.${index}.itemId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Item</FormLabel>
              <Select onValueChange={(value) => {
                const item = items.find(i => i.id === value);
                field.onChange(value);
                setValue(`items.${index}.price`, item?.sellingPrice || 0);
              }} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an item" />
                  </SelectTrigger>
                </FormControl>
                <SelectPortal>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {items.map(item => {
                      const details = [
                        item.author,
                        `Stock: ${item.stock}`,
                        item.stock <= 0 ? 'OUT OF STOCK' : item.stock <= 5 ? 'LOW STOCK' : null
                      ].filter(Boolean).join(' - ');

                      const label = details ? `${item.title} (${details})` : item.title;

                      return (
                        <SelectItem
                          key={item.id}
                          value={item.id}
                          disabled={watchItems.some((i, itemIndex) => i.itemId === item.id && itemIndex !== index)}
                        >
                          <span className={item.stock <= 5 ? 'text-amber-600 font-semibold' : ''}>
                            {label}
                          </span>
                        </SelectItem>
                      );
                    })}
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
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Quantity</FormLabel>
              <FormControl>
                <Input type="number" min="1" max={selectedItem?.stock} placeholder="1" {...field} />
              </FormControl>
              {selectedItem && (
                <div className="flex flex-col gap-0.5 mt-1">
                  <span className="text-xs text-muted-foreground">
                    In stock: {selectedItem.stock}
                  </span>
                  {selectedItem.stock <= 5 && (
                    <span className="text-xs font-bold text-amber-600">
                      Low stock — restock soon.
                    </span>
                  )}
                </div>
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
        aria-label="Remove item"
        className="text-destructive hover:bg-destructive/10"
        onClick={onRemove}
        disabled={disabledRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
