'use client';

import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { Item } from '@/lib/types';
import { packageFormSchema, type PackageFormValues } from './schema';

interface CreatePackageDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  isPending: boolean;
  onSubmit: (data: PackageFormValues) => void;
}

export function CreatePackageDialog({
  isOpen,
  onOpenChange,
  items,
  isPending,
  onSubmit
}: CreatePackageDialogProps) {
  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      name: '',
      description: '',
      items: [{ itemId: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: '',
        description: '',
        items: [{ itemId: '', quantity: 1 }],
      });
    }
  }, [isOpen, form]);

  const handleFormSubmit = (data: PackageFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Create New Package</DialogTitle>
          <DialogDescription>Add books to create a package template.</DialogDescription>
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
              <FormLabel className="block">Items Included</FormLabel>
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
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Package Template
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
