'use client';

import * as React from 'react';
import { Download, PlusCircle } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getCategories, getPurchasesPaginated } from '@/lib/actions';
import type { Category, Purchase } from '@/lib/types';
import { AddOfficeAssetDialog } from './add-office-asset-dialog';
import { ScrollArea } from './ui/scroll-area';
import { PurchasesTable } from './purchases/purchases-table';
import { RecordPurchaseDialog } from './purchases/record-purchase-dialog';
import { AddCategoryDialog } from './items/add-category-dialog';
import { downloadPurchasesPdf, downloadPurchasesXlsx } from './purchases/purchases-export-utils';

interface PurchaseManagementProps {
  userId: string;
}

export default function PurchaseManagement({ userId }: PurchaseManagementProps) {
  const { authUser } = useAuth();
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const { toast } = useToast();
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const { purchases: newPurchases, hasMore: newHasMore } = await getPurchasesPaginated({ userId, pageLimit: 10 });
      setPurchases(newPurchases);
      setHasMore(newHasMore);
      const categoriesData = await getCategories(userId);
      setCategories(categoriesData);
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

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastPurchaseId = purchases[purchases.length - 1]?.id;
    try {
      const { purchases: newPurchases, hasMore: newHasMore } = await getPurchasesPaginated({ userId, pageLimit: 10, lastVisibleId: lastPurchaseId });
      setPurchases(prev => [...prev, ...newPurchases]);
      setHasMore(newHasMore);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load more purchases." });
    } finally {
      setIsLoadingMore(false);
    }
  };

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
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-2xl">Record Purchases</CardTitle>
              <CardDescription>Manage purchases of books and other assets for the store.</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
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
                    <Download className="mr-2 h-4 w-4" /> Download Reports
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
          <PurchasesTable 
            purchases={purchases}
            isInitialLoading={isInitialLoading}
          />
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? 'Loading...' : 'Load More'}
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
