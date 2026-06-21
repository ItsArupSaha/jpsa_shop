'use client';

import * as React from 'react';
import { Search, X, FileText, FileSpreadsheet } from 'lucide-react';

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
import { deleteItem, getCategories, getItems } from '@/lib/actions';
import type { Category, Item } from '@/lib/types';
import { AddItemDialog } from './items/add-item-dialog';
import { AddCategoryDialog } from './items/add-category-dialog';
import { ItemsTable } from './items/items-table';
import { handleDownloadPdf, handleDownloadXlsx } from './expiry/expiry-export-utils';

interface ExpiryAlertsProps {
  userId: string;
}

export default function ExpiryAlerts({ userId }: ExpiryAlertsProps) {
  const { authUser } = useAuth();
  const [allItems, setAllItems] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isItemDialogOpen, setIsItemDialogOpen] = React.useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Item | null>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  // Search and Filter States
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState('all'); // 'all', 'expiringSoon', 'expired'
  const [sortBy, setSortBy] = React.useState('expiry-asc');
  const [visibleCount, setVisibleCount] = React.useState(10);

  const loadData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const allItemsData = await getItems(userId);
      setAllItems(allItemsData);
      
      const categoriesData = await getCategories(userId);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Failed to load expiry alerts data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load medicine details.",
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

  const handleDeleteItem = (id: string) => {
    startTransition(async () => {
      try {
        await deleteItem(userId, id);
        await loadData();
        toast({ title: "Item Deleted", description: "The item has been removed from the inventory." });
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not delete the item." });
      }
    });
  };

  const handleAddNewCategory = () => {
    setIsCategoryDialogOpen(true);
  };

  // Filter items specifically for medicines that are expired or expiring within 30 days
  const filteredAndSortedItems = React.useMemo(() => {
    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setDate(now.getDate() + 30);

    // Only look at items with an expiry date
    let result = allItems.filter(item => !!item.expiryDate);

    // Status filter
    if (selectedStatusFilter === 'expiringSoon') {
      result = result.filter(item => {
        const exp = new Date(item.expiryDate!);
        return exp > now && exp <= oneMonthFromNow;
      });
    } else if (selectedStatusFilter === 'expired') {
      result = result.filter(item => {
        const exp = new Date(item.expiryDate!);
        return exp <= now;
      });
    } else {
      // Default: show both expired and expiring within 30 days
      result = result.filter(item => {
        const exp = new Date(item.expiryDate!);
        return exp <= oneMonthFromNow;
      });
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.title.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q) ||
        (item.medicineGroup && item.medicineGroup.toLowerCase().includes(q)) ||
        (item.company && item.company.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.expiryDate!).getTime();
      const dateB = new Date(b.expiryDate!).getTime();

      if (sortBy === 'expiry-asc') {
        return dateA - dateB;
      }
      if (sortBy === 'expiry-desc') {
        return dateB - dateA;
      }
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'group-asc') {
        const groupA = a.medicineGroup || '';
        const groupB = b.medicineGroup || '';
        return groupA.localeCompare(groupB);
      }
      if (sortBy === 'company-asc') {
        const companyA = a.company || '';
        const companyB = b.company || '';
        return companyA.localeCompare(companyB);
      }
      if (sortBy === 'stock-asc') {
        return a.stock - b.stock;
      }
      return 0;
    });

    return result;
  }, [allItems, searchQuery, selectedStatusFilter, sortBy]);

  const displayedItems = React.useMemo(() => {
    return filteredAndSortedItems.slice(0, visibleCount);
  }, [filteredAndSortedItems, visibleCount]);

  const hasMore = visibleCount < filteredAndSortedItems.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 10);
  };

  const handlePdf = () => {
    handleDownloadPdf(filteredAndSortedItems, authUser);
  };

  const handleXlsx = () => {
    handleDownloadXlsx(filteredAndSortedItems);
  };

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-2xl">Expiry Alerts</CardTitle>
            <CardDescription>View, manage, and download lists of expired medicines or items expiring within 30 days.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePdf} disabled={filteredAndSortedItems.length === 0}>
              <FileText className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleXlsx} disabled={filteredAndSortedItems.length === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items by name, group, manufacturer..."
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
            <Select value={selectedStatusFilter} onValueChange={(val) => {
              setSelectedStatusFilter(val);
              setVisibleCount(10);
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Alerts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Expiry Alerts</SelectItem>
                <SelectItem value="expiringSoon">Expiring Soon (30d)</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expiry-asc">Expiry: Soonest First</SelectItem>
                <SelectItem value="expiry-desc">Expiry: Latest First</SelectItem>
                <SelectItem value="title-asc">Title: A to Z</SelectItem>
                <SelectItem value="group-asc">Medicine Group: A-Z</SelectItem>
                <SelectItem value="company-asc">Company Name: A-Z</SelectItem>
                <SelectItem value="stock-asc">Stock: Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ItemsTable
          items={displayedItems}
          isInitialLoading={isInitialLoading}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          isPending={isPending}
        />

        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button onClick={handleLoadMore}>
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
        onSuccess={loadData}
        onAddCategoryClick={handleAddNewCategory}
      />

      <AddCategoryDialog
        userId={userId}
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        editingCategory={null}
        onSuccess={loadData}
      />
    </Card>
  );
}
