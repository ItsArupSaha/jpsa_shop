'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addItem, updateItem } from '@/lib/actions';
import type { Category, Item } from '@/lib/types';

const itemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  categoryId: z.string().min(1, 'Category is required'),
  author: z.string().optional(),
  medicineGroup: z.string().optional(),
  company: z.string().optional(),
  expiryDate: z.string().optional(),
  productionPrice: z.coerce.number().min(0, 'Production price must be positive'),
  sellingPrice: z.coerce.number().min(0, 'Selling price must be positive'),
  stock: z.coerce.number().int().min(0, 'Stock must be a non-negative integer'),
}).refine(data => data.sellingPrice >= data.productionPrice, {
  message: "Selling price cannot be less than production price.",
  path: ["sellingPrice"],
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface AddItemDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Item | null;
  categories: Category[];
  onSuccess: () => void;
  onAddCategoryClick: () => void;
}

export function AddItemDialog({
  userId,
  isOpen,
  onOpenChange,
  editingItem,
  categories,
  onSuccess,
  onAddCategoryClick,
}: AddItemDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: '',
      categoryId: '',
      author: '',
      medicineGroup: '',
      company: '',
      expiryDate: '',
      productionPrice: 0,
      sellingPrice: 0,
      stock: 0,
    },
  });

  // Reset form when dialog opens or editing item changes
  React.useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        itemForm.reset({
          title: editingItem.title,
          categoryId: editingItem.categoryId,
          author: editingItem.author || '',
          medicineGroup: editingItem.medicineGroup || '',
          company: editingItem.company || '',
          expiryDate: editingItem.expiryDate || '',
          productionPrice: editingItem.productionPrice,
          sellingPrice: editingItem.sellingPrice,
          stock: editingItem.stock,
        });
      } else {
        itemForm.reset({
          title: '',
          categoryId: '',
          author: '',
          medicineGroup: '',
          company: '',
          expiryDate: '',
          productionPrice: 0,
          sellingPrice: 0,
          stock: 0,
        });
      }
    }
  }, [isOpen, editingItem, itemForm]);

  const selectedCategory = categories.find(cat => cat.id === itemForm.watch('categoryId'));
  const showAuthorField = selectedCategory?.name === 'Book';
  const isMedicineCategory = selectedCategory?.name.toLowerCase().includes('medicine');

  const onSubmit = (data: ItemFormValues) => {
    // Validate author field for books
    if (selectedCategory?.name === 'Book' && (!data.author || data.author.trim().length === 0)) {
      toast({ variant: "destructive", title: "Error", description: "Author is required for books." });
      return;
    }

    startTransition(async () => {
      try {
        const itemData: Omit<Item, 'id'> = {
          title: data.title,
          categoryId: data.categoryId,
          categoryName: selectedCategory?.name || '',
          author: selectedCategory?.name === 'Book' ? data.author || undefined : undefined,
          medicineGroup: isMedicineCategory ? data.medicineGroup || undefined : undefined,
          company: isMedicineCategory ? data.company || undefined : undefined,
          expiryDate: isMedicineCategory ? data.expiryDate || undefined : undefined,
          productionPrice: data.productionPrice,
          sellingPrice: data.sellingPrice,
          stock: data.stock,
        };

        if (editingItem) {
          await updateItem(userId, editingItem.id, itemData);
          toast({ title: "Item Updated", description: "The item details have been saved." });
        } else {
          await addItem(userId, itemData);
          toast({ title: "Item Added", description: "The new item is now in your inventory." });
        }
        onSuccess();
        onOpenChange(false);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to save the item." });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          <DialogDescription>
            {editingItem ? 'Update the details of this item.' : 'Enter the details for the new item.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...itemForm}>
          <form onSubmit={itemForm.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-4 pl-1 -mr-4 -ml-1">
              <div className="space-y-4 py-4 px-4">
                <FormField
                  control={itemForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Item name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2">
                  <FormField
                    control={itemForm.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="mt-8"
                    onClick={onAddCategoryClick}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {showAuthorField && (
                  <FormField
                    control={itemForm.control}
                    name="author"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Author</FormLabel>
                        <FormControl>
                          <Input placeholder="Author name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {isMedicineCategory && (
                  <>
                    <FormField
                      control={itemForm.control}
                      name="medicineGroup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medicine Group (Generic Name)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Paracetamol, Omeprazole" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={itemForm.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company / Manufacturer</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Beximco, Square" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={itemForm.control}
                      name="expiryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={itemForm.control}
                    name="productionPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Production Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="5.50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={itemForm.control}
                    name="sellingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selling Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="10.99" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={itemForm.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="15" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter className="pt-4 border-t px-4 pb-4">
              <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save changes"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
