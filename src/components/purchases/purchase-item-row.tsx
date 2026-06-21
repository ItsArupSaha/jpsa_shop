'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

interface PurchaseItemRowProps {
  index: number;
  categories: Category[];
  onAddCategoryClick: () => void;
  onRemove: () => void;
  disabledRemove: boolean;
}

export function PurchaseItemRow({
  index,
  categories,
  onAddCategoryClick,
  onRemove,
  disabledRemove,
}: PurchaseItemRowProps) {
  const { control, watch, setValue } = useFormContext();
  const watchCategoryName = watch(`items.${index}.categoryName`);
  const isMedicine = watchCategoryName?.toLowerCase().includes('medicine');

  return (
    <div className="flex gap-2 items-start p-3 border rounded-md relative">
      <div className={cn(
        "flex-1 grid grid-cols-1 gap-3",
        isMedicine ? "md:grid-cols-4" : "md:grid-cols-6"
      )}>
        <FormField
          control={control}
          name={`items.${index}.itemName`}
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel className="text-xs">Item Name</FormLabel>
              <FormControl><Input placeholder="e.g., Napa 500mg" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
          <Button type="button" variant="outline" size="icon" onClick={onAddCategoryClick}><Plus className="h-4 w-4" /></Button>
        </div>
        {watchCategoryName === 'Book' && (
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
        )}
        {isMedicine && (
          <>
            <FormField
              control={control}
              name={`items.${index}.medicineGroup`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Group (Generic)</FormLabel>
                  <FormControl><Input placeholder="e.g., Paracetamol" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`items.${index}.company`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Company</FormLabel>
                  <FormControl><Input placeholder="e.g., Beximco" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`items.${index}.expiryDate`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Expiry Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
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
            <FormItem className={(watchCategoryName !== 'Book' && !isMedicine) ? 'md:col-start-4' : ''}>
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
        className="text-destructive hover:bg-destructive/10 mt-6"
        onClick={onRemove}
        disabled={disabledRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
