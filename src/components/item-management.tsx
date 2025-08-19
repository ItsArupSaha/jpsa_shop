'use client';

import { addCategory, addItem, deleteCategory, deleteItem, getCategories, getItemsPaginated, initializeDefaultCategories, updateCategory, updateItem } from '@/lib/actions';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { Category, ClosingStock, Item } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { AddOfficeAssetDialog } from './add-office-asset-dialog';

const itemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  categoryId: z.string().min(1, 'Category is required'),
  author: z.string().optional(),
  productionPrice: z.coerce.number().min(0, 'Production price must be positive'),
  sellingPrice: z.coerce.number().min(0, 'Selling price must be positive'),
  stock: z.coerce.number().int().min(0, 'Stock must be a non-negative integer'),
}).refine(data => data.sellingPrice >= data.productionPrice, {
  message: "Selling price cannot be less than production price.",
  path: ["sellingPrice"],
});

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;
type CategoryFormValues = z.infer<typeof categorySchema>;

interface ItemManagementProps {
    userId: string;
}

export default function ItemManagement({ userId }: ItemManagementProps) {
  const { authUser } = useAuth();
  const [items, setItems] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Item | null>(null);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [closingStockDate, setClosingStockDate] = React.useState<Date | undefined>(new Date());
  const [closingStockData, setClosingStockData] = React.useState<ClosingStock[]>([]);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
        const { items: newItems, hasMore: newHasMore } = await getItemsPaginated({ userId, pageLimit: 5 });
        setItems(newItems);
        setHasMore(newHasMore);
        
        // Load categories
        const categoriesData = await getCategories(userId);
        setCategories(categoriesData);
    } catch (error) {
        console.error("Failed to load data:", error);
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
    if(userId) {
        // Initialize default categories first
        initializeDefaultCategories(userId).then(() => {
            loadInitialData();
        });
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

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: '',
      categoryId: '',
      author: '',
      productionPrice: 0,
      sellingPrice: 0,
      stock: 0,
    },
  });

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    itemForm.reset({
      title: item.title,
      categoryId: item.categoryId,
      author: item.author || '',
      productionPrice: item.productionPrice,
      sellingPrice: item.sellingPrice,
      stock: item.stock,
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    itemForm.reset({ title: '', categoryId: '', author: '', productionPrice: 0, sellingPrice: 0, stock: 0 });
    setIsDialogOpen(true);
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    categoryForm.reset({ name: '', description: '' });
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || '',
    });
    setIsCategoryDialogOpen(true);
  };
  
  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteItem(userId, id);
        await loadInitialData();
        toast({ title: "Item Deleted", description: "The item has been removed from the inventory." });
      } catch (error) {
         toast({ variant: "destructive", title: "Error", description: "Could not delete the item." });
      }
    });
  }

  const handleDeleteCategory = (id: string) => {
    startTransition(async () => {
      try {
        await deleteCategory(userId, id);
        await loadInitialData();
        toast({ title: "Category Deleted", description: "The category has been removed." });
      } catch (error) {
         toast({ variant: "destructive", title: "Error", description: "Could not delete the category." });
      }
    });
  }

  const onSubmit = (data: ItemFormValues) => {
    // Validate author field for books
    const selectedCategory = categories.find(cat => cat.id === data.categoryId);
    if (selectedCategory?.name === 'Book' && (!data.author || data.author.trim().length === 0)) {
      toast({ variant: "destructive", title: "Error", description: "Author is required for books." });
      return;
    }

    startTransition(async () => {
      try {
        const itemData = {
          title: data.title,
          categoryId: data.categoryId,
          categoryName: selectedCategory?.name || '',
          author: data.author || undefined,
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
        await loadInitialData();
        setIsDialogOpen(false);
        setEditingItem(null);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to save the item." });
      }
    });
  };

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
        await loadInitialData();
        setIsCategoryDialogOpen(false);
        setEditingCategory(null);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to save the category." });
      }
    });
  };

  const selectedCategory = categories.find(cat => cat.id === itemForm.watch('categoryId'));
  const showAuthorField = selectedCategory?.name === 'Book';

  const handleCalculateClosingStock = async () => {
    if (!closingStockDate) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a date.' });
      return;
    }
    
    setIsCalculating(true);
    try {
        // For now, we'll use the current items as closing stock
        // TODO: Implement proper closing stock calculation based on sales/purchases
        const calculatedData = items.map(item => ({
          ...item,
          closingStock: item.stock
        }));
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
    doc.text(authUser.companyName || 'Store', 14, 20);
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
      head: [['Title', 'Category', 'Author', 'Stock']],
      body: closingStockData.map(item => [item.title, item.categoryName, item.author || '-', item.closingStock]),
    });
    
    doc.save(`closing-stock-report-${format(closingStockDate, 'yyyy-MM-dd')}.pdf`);
  };

  const handleDownloadClosingStockXlsx = () => {
    if (!closingStockData.length || !closingStockDate) return;
    
    const dataToExport = closingStockData.map(item => ({
      Title: item.title,
      Category: item.categoryName,
      Author: item.author || '-',
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
            <div className="flex gap-2">
              <AddOfficeAssetDialog userId={userId} onAssetAdded={loadInitialData} />
              <Button onClick={handleAddNew} className="bg-primary hover:bg-primary/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
              </Button>
            </div>
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
        {/* Categories Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Categories</h3>
            <Button onClick={handleAddCategory} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{category.name}</p>
                  {category.description && (
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditCategory(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCategory(category.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {closingStockData.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Closing Stock as of {closingStockDate ? format(closingStockDate, 'PPP') : ''}</h3>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closingStockData.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>{item.categoryName}</TableCell>
                      <TableCell>{item.author || '-'}</TableCell>
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
                <TableHead>Category</TableHead>
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
                    <TableCell>{item.categoryName}</TableCell>
                    <TableCell>{item.author || '-'}</TableCell>
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

      {/* Add/Edit Item Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                    onClick={handleAddCategory}
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
              <DialogFooter className="pt-4 border-t">
                <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save changes"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
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
    </Card>
  );
}
