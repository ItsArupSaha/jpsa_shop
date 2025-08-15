
'use client';

import { addItem, calculateClosingStock, deleteItem, getItemsPaginated, updateItem, getItemCategories, addItemCategory } from '@/lib/actions';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Edit, FileSpreadsheet, FileText, Loader2, Plus, PlusCircle, Trash2 } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import * as XLSX from 'xlsx';
import * as z from 'zod';


import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Item, ClosingStockItem, ItemCategory } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const itemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.string().min(1, 'Category is required'),
  author: z.string().optional(),
  productionPrice: z.coerce.number().min(0, 'Production price must be positive'),
  sellingPrice: z.coerce.number().min(0, 'Selling price must be positive'),
  stock: z.coerce.number().int().min(0, 'Stock must be a non-negative integer'),
}).refine(data => data.sellingPrice >= data.productionPrice, {
  message: "Selling price cannot be less than production price.",
  path: ["sellingPrice"],
}).refine(data => {
    if (data.category === 'Book') {
        return !!data.author && data.author.length > 0;
    }
    return true;
}, {
    message: "Author is required for books.",
    path: ['author'],
});

const newCategorySchema = z.object({
    name: z.string().min(2, 'Category name must be at least 2 characters.'),
});

type ItemFormValues = z.infer<typeof itemSchema>;
type NewCategoryFormValues = z.infer<typeof newCategorySchema>;

interface ItemManagementProps {
    userId: string;
}

export default function ItemManagement({ userId }: ItemManagementProps) {
  const { authUser } = useAuth();
  const [items, setItems] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<ItemCategory[]>([{id: '1', name: 'Book'}, {id: '2', name: 'Accessory'}]);
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = React.useState(false);

  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Item | null>(null);
  const [closingStockDate, setClosingStockDate] = React.useState<Date | undefined>(new Date());
  const [closingStockData, setClosingStockData] = React.useState<ClosingStockItem[]>([]);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
        const [{ items: newItems, hasMore: newHasMore }, fetchedCategories] = await Promise.all([
            getItemsPaginated({ userId, pageLimit: 5 }),
            getItemCategories(userId)
        ]);
        setItems(newItems);
        setHasMore(newHasMore);
        setCategories(prev => [...prev, ...fetchedCategories]);
    } catch (error) {
        console.error("Failed to load items:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load item data. Please try again later.",
        });
    } finally {
        setIsInitialLoading(false);
    }
}, [userId, toast]);

  React.useEffect(() => {
    if(userId) {
        loadInitialData();
    }
  }, [userId, loadInitialData]);


  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastItemId = items[items.length - 1]?.id;
    try {
        const { items: newItems, hasMore: newHasMore } = await getItemsPaginated({ userId, pageLimit: 5, lastVisibleId: lastItemId });
        setItems(prev => [...prev, ...newItems]);
        setHasMore(newHasMore);
    } catch (error) {
        console.error("Failed to load more items:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load more items.",
        });
    } finally {
        setIsLoadingMore(false);
    }
  };

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: '',
      author: '',
      category: 'Book',
      productionPrice: 0,
      sellingPrice: 0,
      stock: 0,
    },
  });

  const categoryForm = useForm<NewCategoryFormValues>({
      resolver: zodResolver(newCategorySchema),
      defaultValues: { name: '' },
  });

  const watchCategory = form.watch('category');

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    form.reset(item);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    form.reset({ title: '', author: '', category: 'Accessory', productionPrice: 0, sellingPrice: 0, stock: 0 });
    setIsDialogOpen(true);
  };
  
  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteItem(userId, id);
        await loadInitialData(); // Reload data to reflect deletion
        toast({ title: "Item Deleted", description: "The item has been removed from the inventory." });
      } catch (error) {
         toast({ variant: "destructive", title: "Error", description: "Could not delete the item." });
      }
    });
  }

  const onSubmit = (data: ItemFormValues) => {
    startTransition(async () => {
      try {
        if (editingItem) {
          await updateItem(userId, editingItem.id, data);
          toast({ title: "Item Updated", description: "The item details have been saved." });
        } else {
          await addItem(userId, data);
          toast({ title: "Item Added", description: "The new item is now in your inventory." });
        }
        await loadInitialData(); // Reload to show the changes
        setIsDialogOpen(false);
        setEditingItem(null);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to save the item." });
      }
    });
  };

  const onAddCategory = async (data: NewCategoryFormValues) => {
    try {
        const newCategory = await addItemCategory(userId, data.name);
        setCategories(prev => [...prev, newCategory]);
        toast({ title: "Category Added", description: `"${data.name}" is now available.` });
        categoryForm.reset();
        setIsCategoryPopoverOpen(false);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error adding category",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
        });
    }
  }
  
  const handleCalculateClosingStock = async () => {
    if (!closingStockDate) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a date.' });
      return;
    }
    
    setIsCalculating(true);
    try {
        const calculatedData = await calculateClosingStock(userId, closingStockDate);
        setClosingStockData(calculatedData);
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not calculate closing stock." });
    } finally {
        setIsCalculating(false);
        setIsStockDialogOpen(false);
    }
  }

  const handleDownloadClosingStockPdf = () => {
    if (!closingStockData.length || !closingStockDate || !authUser) return;
    
    const doc = new jsPDF();
    const dateString = format(closingStockDate, 'PPP');
    
    // Left side header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(authUser.companyName || 'Bookstore', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(authUser.address || '', 14, 26);
    doc.text(authUser.phone || '', 14, 32);

    // Right side header
    let yPos = 20;
    if (authUser.bkashNumber) {
        doc.text(`Bkash: ${authUser.bkashNumber}`, 200, yPos, { align: 'right' });
        yPos += 6;
    }
    if (authUser.bankInfo) {
        doc.text(`Bank: ${authUser.bankInfo}`, 200, yPos, { align: 'right' });
    }

    // Report Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Closing Stock Report', 105, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`As of ${dateString}`, 105, 51, { align: 'center' });
    doc.setTextColor(0);


    autoTable(doc, {
      startY: 60,
      head: [['Title', 'Author', 'Stock']],
      body: closingStockData.map(item => [item.title, item.author, item.closingStock]),
    });
    
    doc.save(`closing-stock-report-${format(closingStockDate, 'yyyy-MM-dd')}.pdf`);
  };

  const handleDownloadClosingStockXlsx = () => {
    if (!closingStockData.length || !closingStockDate) return;
    
    const dataToExport = closingStockData.map(item => ({
      Title: item.title,
      Author: item.author,
      Stock: item.closingStock,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Auto-fit columns
    const columnWidths = Object.keys(dataToExport[0]).map(key => {
        const maxLength = Math.max(
            ...dataToExport.map(row => String(row[key as keyof typeof row]).length),
            key.length
        );
        return { wch: maxLength + 2 }; // +2 for a little padding
    });
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Closing Stock');
    XLSX.writeFile(workbook, `closing-stock-report-${format(closingStockDate, 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-2xl">Item Inventory</CardTitle>
            <CardDescription>Manage your item catalog, prices, and stock levels.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 items-end">
             <Button onClick={handleAddNew} className="bg-primary hover:bg-primary/90">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
            </Button>
            <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" /> Download Stock
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Calculate Closing Stock</DialogTitle>
                        <DialogDescription>Select a date to calculate the closing stock for all items up to that day.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                        <div className="flex flex-col items-center gap-4">
                            <Calendar
                                mode="single"
                                selected={closingStockDate}
                                onSelect={setClosingStockDate}
                                initialFocus
                                numberOfMonths={1}
                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            />
                            <p className="text-sm text-muted-foreground">
                                {closingStockDate ? (
                                    <>Selected: {format(closingStockDate, "LLL dd, y")}</>
                                ) : (
                                    <span>Please pick a date.</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCalculateClosingStock} disabled={isCalculating || !closingStockDate}>
                            {isCalculating ? "Calculating..." : "Calculate"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {closingStockData.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Closing Stock as of {closingStockDate ? format(closingStockDate, 'PPP') : ''}</h3>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closingStockData.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>{item.author}</TableCell>
                      <TableCell className="text-right">{item.closingStock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
             <div className="flex items-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handleDownloadClosingStockPdf}>
                <FileText className="mr-2 h-4 w-4" /> Download PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadClosingStockXlsx}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel
              </Button>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setClosingStockData([])}>Clear Results</Button>
            </div>
            <hr className="my-6"/>
          </div>
        )}

        <h3 className="text-lg font-semibold mb-2">Current Inventory</h3>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isInitialLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-3/4 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{item.author}</TableCell>
                    <TableCell className="text-right">৳{item.sellingPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{item.stock}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} disabled={isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading...</> : 'Load More'}
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the details of this item.' : 'Enter the details for the new item.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
             <div className="flex-1 overflow-y-auto pr-4 pl-1 -mr-4 -ml-1">
                <div className="space-y-4 py-4 px-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="The Great Gatsby" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <div className="flex items-center gap-2">
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button type="button" variant="outline" size="icon" className="shrink-0">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-60">
                                    <Form {...categoryForm}>
                                        <form onSubmit={categoryForm.handleSubmit(onAddCategory)} className="space-y-4">
                                            <div className="space-y-1">
                                                <h4 className="font-medium text-sm">Add New Category</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Create a new category for your items.
                                                </p>
                                            </div>
                                             <FormField
                                                control={categoryForm.control}
                                                name="name"
                                                render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="e.g., Electronics" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                                )}
                                            />
                                            <Button type="submit" size="sm" className="w-full">Save</Button>
                                        </form>
                                    </Form>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                {watchCategory === 'Book' && (
                    <FormField
                    control={form.control}
                    name="author"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Author</FormLabel>
                        <FormControl>
                            <Input placeholder="F. Scott Fitzgerald" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
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
                    control={form.control}
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
                  control={form.control}
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
              <DialogFooter className="pt-4 border-t">
                <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save changes"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
