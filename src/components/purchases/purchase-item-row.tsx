'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { Category, Item } from '@/lib/types';

interface PurchaseItemRowProps {
  index: number;
  categories: Category[];
  items: Item[];
  onAddCategoryClick: () => void;
  onRemove: () => void;
  disabledRemove: boolean;
}

export function PurchaseItemRow({
  index,
  categories,
  items,
  onAddCategoryClick,
  onRemove,
  disabledRemove,
}: PurchaseItemRowProps) {
  const { control, watch, setValue } = useFormContext();
  const watchCategoryId = watch(`items.${index}.categoryId`);

  const [selectedItemId, setSelectedItemId] = React.useState('__new__');
  const [isNewItem, setIsNewItem] = React.useState(true);

  const categoryItems = React.useMemo(() => {
    if (!watchCategoryId) return [];
    return items.filter(item => item.categoryId === watchCategoryId);
  }, [items, watchCategoryId]);

  React.useEffect(() => {
    setSelectedItemId('__new__');
    setIsNewItem(true);
  }, [watchCategoryId]);

  const handleItemChange = (value: string) => {
    setSelectedItemId(value);
    if (value === '__new__') {
      setIsNewItem(true);
      setValue(`items.${index}.itemId`, undefined);
      setValue(`items.${index}.itemName`, '');
      setValue(`items.${index}.author`, '');
      setValue(`items.${index}.sellingPrice`, 0);
    } else {
      setIsNewItem(false);
      const item = categoryItems.find(i => i.id === value);
      if (item) {
        setValue(`items.${index}.itemId`, item.id);
        setValue(`items.${index}.itemName`, item.title);
        setValue(`items.${index}.author`, item.author || '');
        setValue(`items.${index}.sellingPrice`, item.sellingPrice || 0);
      }
    }
  };

  return (
    <div className="flex gap-2 items-start p-3 border rounded-md relative">
      <div className="flex-1 grid grid-cols-1 gap-3 md:grid-cols-6">
        <div className="md:col-span-2 space-y-2">
          {categoryItems.length > 0 && (
            <FormItem>
              <FormLabel className="text-xs">Select Existing Item</FormLabel>
              <Select onValueChange={handleItemChange} value={selectedItemId}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an existing item" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__new__">+ Add New Item</SelectItem>
                  {categoryItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title} {item.author ? `(by ${item.author})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}

          <FormField
            control={control}
            name={`items.${index}.itemName`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">{isNewItem ? "Item Name (New)" : "Item Name"}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., The Midnight Library"
                    disabled={!isNewItem}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex items-end gap-2">
          <FormField
            control={control}
            name={`items.${index}.categoryId`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="text-xs">Category</FormLabel>
                <Select onValueChange={(value) => {
                  const category = categories.find(c => c.id === value);
                  field.onChange(value);
                  setValue(`items.${index}.categoryName`, category?.name || '');
                }} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="button" variant="outline" size="icon" aria-label="Add category" onClick={onAddCategoryClick}><Plus className="h-4 w-4" /></Button>
        </div>
        <FormField
          control={control}
          name={`items.${index}.author`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Author</FormLabel>
              <FormControl><Input placeholder="e.g., Matt Haig" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
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
          control={control}
          name={`items.${index}.cost`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Unit Cost</FormLabel>
              <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`items.${index}.sellingPrice`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Selling Price</FormLabel>
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
        aria-label="Remove item"
        className="text-destructive hover:bg-destructive/10 mt-6"
        onClick={onRemove}
        disabled={disabledRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
