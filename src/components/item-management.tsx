'use client';

import * as React from 'react';
import { PlusCircle, Search, X } from 'lucide-react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { deleteCategory, deleteItem, getCategories, getItems, calculateClosingStock } from '@/lib/actions';
import type { Category, ClosingStock, Item } from '@/lib/types';
import { AddExistingAssetDialog } from './add-existing-asset-dialog';
import { AddItemDialog } from './items/add-item-dialog';
import { AddCategoryDialog } from './items/add-category-dialog';
import { ItemsTable } from './items/items-table';
import { ClosingStockDialog } from './items/closing-stock-dialog';
import { exportClosingStockPdf, exportClosingStockXlsx } from './items/items-export-utils';
import { CategoriesList } from './items/categories-list';
import { ClosingStockResults } from './items/closing-stock-results';

interface ItemManagementProps {
  userId: string;
}

export default function ItemManagement({ userId }: ItemManagementProps) {
  const { authUser } = useAuth();
  const [allItems, setAllItems] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);

  // Dialog Open States
  const [isItemDialogOpen, setIsItemDialogOpen] = React.useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = React.useState(false);
  const [itemPendingDelete, setItemPendingDelete] = React.useState<Item | null>(null);
  const [categoryPendingDelete, setCategoryPendingDelete] = React.useState<Category | null>(null);

  // Editing States
  const [editingItem, setEditingItem] = React.useState<Item | null>(null);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);

  // Closing Stock
  const [closingStockDate, setClosingStockDate] = React.useState<Date | undefined>(new Date());
  const [closingStockData, setClosingStockData] = React.useState<ClosingStock[]>([]);
  const [isCalculating, setIsCalculating] = React.useState(false);

  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  // Search and Filter States
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = React.useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('title-asc');
  const [visibleCount, setVisibleCount] = React.useState(10);

  const loadData = React.useCallback(async (silent = false) => {
    if (!silent) {
      setIsInitialLoading(true);
    }
    try {
      const allItemsData = await getItems(userId);
      setAllItems(allItemsData);

      const categoriesData = await getCategories(userId);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not load data. Please try again later.',
      });
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, loadData]);

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setIsItemDialogOpen(true);
  };

  const handleAddNewItem = () => {
    setEditingItem(null);
    setIsItemDialogOpen(true);
  };

  const handleAddNewCategory = () => {
    setEditingCategory(null);
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleConfirmDeleteItem = () => {
    const item = itemPendingDelete;
    if (!item) return;
    startTransition(async () => {
      try {
        await deleteItem(userId, item.id);
        await loadData(true);
        toast({ title: 'Item Deleted', description: `"${item.title}" has been removed from the catalog.` });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the item.' });
      } finally {
        setItemPendingDelete(null);
      }
    });
  };

  const handleConfirmDeleteCategory = () => {
    const category = categoryPendingDelete;
    if (!category) return;
    startTransition(async () => {
      try {
        await deleteCategory(userId, category.id);
        await loadData(true);
        toast({ title: 'Category Deleted', description: `The category "${category.name}" has been removed.` });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the category.' });
      } finally {
        setCategoryPendingDelete(null);
      }
    });
  };

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
      toast({ variant: 'destructive', title: 'Error', description: 'Could not calculate closing stock.' });
    } finally {
      setIsCalculating(false);
      setIsStockDialogOpen(false);
    }
  };

  const handleDownloadClosingStockPdf = () => {
    if (!closingStockDate) return;
    exportClosingStockPdf(closingStockData, closingStockDate, authUser);
  };

  const handleDownloadClosingStockXlsx = () => {
    if (!closingStockDate) return;
    exportClosingStockXlsx(closingStockData, closingStockDate);
  };

  // Client-side filtering & sorting
  const filteredAndSortedItems = React.useMemo(() => {
    let result = [...allItems];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.categoryName.toLowerCase().includes(q) ||
          (item.author && item.author.toLowerCase().includes(q))
      );
    }

    if (selectedCategoryFilter !== 'all') {
      result = result.filter((item) => item.categoryId === selectedCategoryFilter);
    }

    if (selectedStatusFilter === 'lowStock') {
      result = result.filter((item) => item.stock <= 5);
    } else if (selectedStatusFilter === 'outOfStock') {
      result = result.filter((item) => item.stock <= 0);
    }

    result.sort((a, b) => {
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'title-desc') {
        return b.title.localeCompare(a.title);
      }
      if (sortBy === 'stock-asc') {
        return a.stock - b.stock;
      }
      if (sortBy === 'stock-desc') {
        return b.stock - a.stock;
      }
      if (sortBy === 'author-asc') {
        return (a.author || '').localeCompare(b.author || '');
      }
      return 0;
    });

    return result;
  }, [allItems, searchQuery, selectedCategoryFilter, selectedStatusFilter, sortBy]);

  const displayedItems = React.useMemo(() => {
    return filteredAndSortedItems.slice(0, visibleCount);
  }, [filteredAndSortedItems, visibleCount]);

  const hasMore = visibleCount < filteredAndSortedItems.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div>
            <CardTitle className="font-headline text-2xl">Item Catalog</CardTitle>
            <CardDescription>Manage your books, prices, and stock levels.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleAddNewItem} className="bg-primary hover:bg-primary/90">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
            </Button>
            <AddExistingAssetDialog userId={userId} onAssetAdded={() => loadData(true)}>
              <Button variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Existing Asset
              </Button>
            </AddExistingAssetDialog>
            <ClosingStockDialog
              isOpen={isStockDialogOpen}
              onOpenChange={setIsStockDialogOpen}
              closingStockDate={closingStockDate}
              onDateChange={setClosingStockDate}
              onCalculate={handleCalculateClosingStock}
              isCalculating={isCalculating}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Categories Section */}
        <CategoriesList
          categories={categories}
          onAddClick={handleAddNewCategory}
          onEditClick={handleEditCategory}
          onDeleteClick={(id) => {
            const category = categories.find((c) => c.id === id);
            if (category) setCategoryPendingDelete(category);
          }}
          isPending={isPending}
        />

        {/* Closing Stock Section */}
        <ClosingStockResults
          closingStockData={closingStockData}
          closingStockDate={closingStockDate}
          onDownloadPdf={handleDownloadClosingStockPdf}
          onDownloadXlsx={handleDownloadClosingStockXlsx}
          onClear={() => setClosingStockData([])}
        />

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Current Inventory</h3>
          <p className="text-sm text-muted-foreground">{filteredAndSortedItems.length} item(s)</p>
        </div>

        {/* Search, Filter, and Sort Controls */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items by title, author, or category..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(10);
              }}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Clear search"
                className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearchQuery('');
                  setVisibleCount(10);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={selectedCategoryFilter}
              onValueChange={(val) => {
                setSelectedCategoryFilter(val);
                setVisibleCount(10);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedStatusFilter}
              onValueChange={(val) => {
                setSelectedStatusFilter(val);
                setVisibleCount(10);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Levels</SelectItem>
                <SelectItem value="lowStock">Low Stock (≤5)</SelectItem>
                <SelectItem value="outOfStock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title-asc">Title: A to Z</SelectItem>
                <SelectItem value="title-desc">Title: Z to A</SelectItem>
                <SelectItem value="author-asc">Author: A to Z</SelectItem>
                <SelectItem value="stock-asc">Stock: Low to High</SelectItem>
                <SelectItem value="stock-desc">Stock: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ItemsTable
          items={displayedItems}
          isInitialLoading={isInitialLoading}
          onEdit={handleEditItem}
          onDelete={(item) => setItemPendingDelete(item)}
          isPending={isPending}
        />

        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={handleLoadMore}>
              Load More
            </Button>
          </div>
        )}
      </CardContent>

      <AddItemDialog
        userId={userId}
        isOpen={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        editingItem={editingItem}
        categories={categories}
        onSuccess={() => loadData(true)}
        onAddCategoryClick={handleAddNewCategory}
      />

      <AddCategoryDialog
        userId={userId}
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        editingCategory={editingCategory}
        onSuccess={() => loadData(true)}
      />

      <ConfirmDialog
        open={itemPendingDelete !== null}
        onOpenChange={(open) => !open && setItemPendingDelete(null)}
        title="Delete this item?"
        description={itemPendingDelete ? `"${itemPendingDelete.title}" will be removed from the catalog. Past sales and reports keep their records.` : ''}
        onConfirm={handleConfirmDeleteItem}
        isPending={isPending}
      />

      <ConfirmDialog
        open={categoryPendingDelete !== null}
        onOpenChange={(open) => !open && setCategoryPendingDelete(null)}
        title="Delete this category?"
        description={categoryPendingDelete ? `The category "${categoryPendingDelete.name}" will be removed. Items in it are not deleted.` : ''}
        onConfirm={handleConfirmDeleteCategory}
        isPending={isPending}
      />
    </Card>
  );
}
