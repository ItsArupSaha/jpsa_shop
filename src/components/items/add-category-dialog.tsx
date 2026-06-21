'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

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
import { useToast } from '@/hooks/use-toast';
import { addCategory, updateCategory } from '@/lib/actions';
import type { Category } from '@/lib/types';

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface AddCategoryDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory: Category | null;
  onSuccess: () => void;
}

export function AddCategoryDialog({
  userId,
  isOpen,
  onOpenChange,
  editingCategory,
  onSuccess,
}: AddCategoryDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Reset form when dialog opens or editing category changes
  React.useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        categoryForm.reset({
          name: editingCategory.name,
          description: editingCategory.description || '',
        });
      } else {
        categoryForm.reset({
          name: '',
          description: '',
        });
      }
    }
  }, [isOpen, editingCategory, categoryForm]);

  const onSubmitCategory = (data: CategoryFormValues) => {
    startTransition(async () => {
      try {
        if (editingCategory) {
          await updateCategory(userId, editingCategory.id, data);
          toast({ title: "Category Updated", description: "The category has been updated." });
        } else {
          await addCategory(userId, data);
          toast({ title: "Category Added", description: "The new category has been created." });
        }
        onSuccess();
        onOpenChange(false);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to save the category." });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          <DialogDescription>
            {editingCategory ? 'Update the category details.' : 'Create a new category for your items.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...categoryForm}>
          <form onSubmit={categoryForm.handleSubmit(onSubmitCategory)} className="space-y-4">
            <FormField
              control={categoryForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Books, Electronics, Stationery" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={categoryForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of this category" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save Category"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
