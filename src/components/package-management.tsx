'use client';

import { addPackage, deletePackage, getItems, getPackages, updatePackage } from '@/lib/actions';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Loader2, Package as PackageIcon, PlusCircle, Trash2 } from 'lucide-react';
import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Item, PackageTemplate } from '@/lib/types';
import { PackageSaleDialog } from './package-sale-dialog';
import { Skeleton } from './ui/skeleton';

const packageItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
});

const packageFormSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  description: z.string().optional().default(''),
  items: z.array(packageItemSchema).min(1, 'At least one item is required'),
});

type PackageFormValues = z.infer<typeof packageFormSchema>;

interface PackageManagementProps {
  userId: string;
}

export default function PackageManagement({ userId }: PackageManagementProps) {
  const [packages, setPackages] = React.useState<PackageTemplate[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const [packagesData, itemsData] = await Promise.all([
        getPackages(userId),
        getItems(userId),
      ]);
      setPackages(packagesData);
      setItems(itemsData);
    } catch (error) {
      console.error("Failed to load package data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load data. Please try again later.",
      });
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadInitialData();
    }
  }, [userId, loadInitialData]);

  const getItemTitle = (itemId: string) => items.find(i => i.id === itemId)?.title || 'Unknown Item';

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

  const handleAddNew = () => {
    form.reset({
      name: '',
      description: '',
      items: [{ itemId: '', quantity: 1 }],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (packageId: string) => {
    startTransition(async () => {
      const result = await deletePackage(userId, packageId);
      if (result.success) {
        toast({ title: 'Package Deleted', description: 'The package template has been removed.' });
        loadInitialData();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to delete package.' });
      }
    });
  };

  const onSubmit = (data: PackageFormValues) => {
    startTransition(async () => {
      const result = await addPackage(userId, data);
      if (result.success) {
        toast({ title: 'Package Created', description: 'The new package template has been saved.' });
        loadInitialData();
        setIsDialogOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to create package.' });
      }
    });
  };

  return (
    <>
      <Card className="animate-in fade-in-50">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <PackageIcon className="h-6 w-6" /> Package Management
              </CardTitle>
              <CardDescription>Create reusable bundles to sell quickly at an offered price.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Package
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Original Value</TableHead>
                  <TableHead className="text-right w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isInitialLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : packages.length > 0 ? (
                  packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell className="text-muted-foreground">{pkg.description || '-'}</TableCell>
                      <TableCell className="max-w-[250px] truncate" title={pkg.items.map(i => `${i.quantity}x ${getItemTitle(i.itemId)}`).join(', ')}>
                        {pkg.items.map(i => `${i.quantity}x ${getItemTitle(i.itemId)}`).join(', ')}
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        ৳{pkg.items.reduce((sum, pkgItem) => {
                          const item = items.find(i => i.id === pkgItem.itemId);
                          return sum + (item?.sellingPrice || 0) * pkgItem.quantity;
                        }, 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <PackageSaleDialog
                          packageTemplate={pkg}
                          items={items}
                          userId={userId}
                          onSaleComplete={loadInitialData}
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg.id)} disabled={isPending}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No packages created yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-headline">Create New Package</DialogTitle>
            <DialogDescription>Add books to create a package template.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Book</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        render={({ field }) => (
                          <FormItem className="w-[100px]">
                            <FormLabel className="text-xs">Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" placeholder="1" {...field} />
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
    </>
  );
}
