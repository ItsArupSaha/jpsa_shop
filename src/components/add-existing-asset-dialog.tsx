
'use client';

import { useToast } from '@/hooks/use-toast';
import { addExistingAsset } from '@/lib/actions';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const assetSchema = z.object({
  itemName: z.string().min(2, { message: 'Asset name must be at least 2 characters.' }),
  quantity: z.coerce.number().int().min(1, { message: 'Quantity must be at least 1.' }),
  value: z.coerce.number().min(0.01, { message: 'Value must be a positive number.' }),
});

type AssetFormValues = z.infer<typeof assetSchema>;

interface AddExistingAssetDialogProps {
  userId: string;
  onAssetAdded: () => void;
  children: React.ReactNode;
}

export function AddExistingAssetDialog({ userId, onAssetAdded, children }: AddExistingAssetDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      itemName: '',
      quantity: 1,
      value: 0,
    },
  });

  const onSubmit = (data: AssetFormValues) => {
    startTransition(async () => {
      const result = await addExistingAsset(userId, data);
      if (result.success) {
        toast({
          title: 'Existing Asset Added',
          description: `Successfully recorded ${data.itemName}.`,
        });
        onAssetAdded(); // Refresh data on the parent page
        setIsOpen(false);
        form.reset();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'error' in result ? result.error : 'Failed to add existing asset.',
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Add Existing Asset</DialogTitle>
          <DialogDescription>
            Record an asset you already own. This will not create an expense.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-4 pl-1 -mr-4 -ml-1">
                <div className="space-y-4 py-4 px-4">
                    <FormField
                    control={form.control}
                    name="itemName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Asset Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Office Desk" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                            <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="value"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Value</FormLabel>
                            <FormControl>
                            <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    </div>
                </div>
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Asset
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
