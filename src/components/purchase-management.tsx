'use client';

import * as React from 'react';
import { Download, PlusCircle, Search, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getCategories, getPurchases, getItems } from '@/lib/actions';
import type { Category, Purchase, Item } from '@/lib/types';
import { AddOfficeAssetDialog } from './add-office-asset-dialog';
import { ScrollArea } from './ui/scroll-area';
import { PurchasesTable } from './purchases/purchases-table';
import { RecordPurchaseDialog } from './purchases/record-purchase-dialog';
import { AddCategoryDialog } from './items/add-category-dialog';
import { downloadPurchasesPdf, downloadPurchasesXlsx } from './purchases/purchases-export-utils';

interface PurchaseManagementProps {
  userId: string;
}

const PAGE_SIZE = 10;

export default function PurchaseManagement({ userId }: PurchaseManagementProps) {
  const { authUser } = useAuth();
  const [allPurchases, setAllPurchases] = React.useState<Purchase[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const { toast } = useToast();

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const [purchasesData, categoriesData, itemsData] = await Promise.all([
        getPurchases(userId),
        getCategories(userId),
        getItems(userId),
      ]);
      setAllPurchases(purchasesData);
      setCategories(categoriesData);
      setItems(itemsData);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load purchases." });
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadInitialData();
    }
  }, [userId, loadInitialData]);

  const filteredPurchases = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allPurchases;
    return allPurchases.filter(p =>
      p.purchaseId.toLowerCase().includes(q) ||
      p.supplier.toLowerCase().includes(q) ||
      p.items.some(i => i.itemName.toLowerCase().includes(q))
    );
  }, [allPurchases, searchQuery]);

  const visiblePurchases = React.useMemo(
    () => filteredPurchases.slice(0, visibleCount),
    [filteredPurchases, visibleCount]
  );
  const hasMore = visibleCount < filteredPurchases.length;

  const handleDownloadPdf = async () => {
    try {
      const success = await downloadPurchasesPdf(userId, dateRange, authUser);
      if (!success) {
        toast({ title: 'No Purchases Found', description: 'There are no purchases in the selected date range.' });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to download PDF." });
    }
  };

  const handleDownloadXlsx = async () => {
    try {
      const success = await downloadPurchasesXlsx(userId, dateRange);
      if (!success) {
        toast({ title: 'No Purchases Found', description: 'There are no purchases in the selected date range.' });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to download Excel." });
    }
  };

  return (
    <>
      <Card className="animate-in fade-in-50">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <CardTitle className="font-headline text-2xl">Purchases</CardTitle>
              <CardDescription>Manage purchases of books and other assets for the store.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Button onClick={() => setIsDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Record New Purchase
              </Button>
              <AddOfficeAssetDialog userId={userId} onAssetAdded={loadInitialData}>
                <Button variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Office Asset
                </Button>
              </AddOfficeAssetDialog>
              <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Export
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Download Purchase Report</DialogTitle>
                    <DialogDescription>Select a date range to download your purchase data.</DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[calc(100vh-20rem)] overflow-y-auto">
                    <div className="py-4 flex flex-col items-center gap-4">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={1}
                      />
                    </div>
                  </ScrollArea>
                  <DialogFooter className="gap-2 sm:justify-center pt-4 border-t">
                    <Button variant="outline" onClick={handleDownloadPdf} disabled={!dateRange?.from}>PDF</Button>
                    <Button variant="outline" onClick={handleDownloadXlsx} disabled={!dateRange?.from}>Excel</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search purchases by ID, supplier, or item..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(PAGE_SIZE);
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
                    setVisibleCount(PAGE_SIZE);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground md:py-2">{filteredPurchases.length} purchase(s)</p>
          </div>

          <PurchasesTable
            purchases={visiblePurchases}
            isInitialLoading={isInitialLoading}
          />
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <RecordPurchaseDialog
        userId={userId}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        categories={categories}
        items={items}
        onSuccess={loadInitialData}
        onAddCategoryClick={() => setIsCategoryDialogOpen(true)}
      />

      <AddCategoryDialog
        userId={userId}
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        editingCategory={null}
        onSuccess={loadInitialData}
      />
    </>
  );
}

