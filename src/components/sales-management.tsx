'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Download, Loader2, PlusCircle, Search, X, FileText, FileSpreadsheet } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { deleteSale, getCustomers, getItems, getSalesPaginated, searchSales } from '@/lib/actions';
import type { Customer, Item, Sale } from '@/lib/types';
import { Calendar } from './ui/calendar';
import { ScrollArea } from './ui/scroll-area';
import { SalesTable } from './sales/sales-table';
import { RecordSaleDialog } from './sales/record-sale-dialog';
import {
  downloadSalesPdf,
  downloadSalesXlsx,
  downloadSalesItemsPdf,
  downloadSalesItemsXlsx,
} from './sales/sales-export-utils';

interface SalesManagementProps {
  userId: string;
}

export default function SalesManagement({ userId }: SalesManagementProps) {
  const { authUser } = useAuth();
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<Sale[]>([]);

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const [{ sales: newSales, hasMore: newHasMore }, itemsData, customersData] = await Promise.all([
        getSalesPaginated({ userId, pageLimit: 5 }),
        getItems(userId),
        getCustomers(userId),
      ]);
      setSales(newSales);
      setHasMore(newHasMore);
      setItems(itemsData);
      setCustomers(customersData);
    } catch (error) {
      console.error("Failed to load initial sales data:", error);
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

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastSaleId = sales[sales.length - 1]?.id;
    try {
      const { sales: newSales, hasMore: newHasMore } = await getSalesPaginated({ userId, pageLimit: 5, lastVisibleId: lastSaleId });
      setSales(prev => [...prev, ...newSales]);
      setHasMore(newHasMore);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load more sales.",
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchSales(userId, searchTerm.trim());
      setSearchResults(results);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Search Error', description: 'Failed to search sales.' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
  };

  const displaySales = searchTerm.trim() !== '' ? searchResults : sales;

  const handleDelete = (saleId: string) => {
    startTransition(async () => {
      const result = await deleteSale(userId, saleId);
      if (result.success) {
        toast({ title: 'Sale Deleted', description: 'The sale has been removed and stock restored.' });
        loadInitialData();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to delete sale.' });
      }
    });
  };

  const handleDownloadPdf = async () => {
    try {
      const success = await downloadSalesPdf(userId, dateRange, authUser, items, customers);
      if (!success) {
        toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to download PDF." });
    }
  };

  const handleDownloadXlsx = async () => {
    try {
      const success = await downloadSalesXlsx(userId, dateRange, items, customers);
      if (!success) {
        toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to download Excel." });
    }
  };

  const handleDownloadItemsPdf = async () => {
    try {
      const success = await downloadSalesItemsPdf(userId, dateRange, authUser, items);
      if (!success) {
        toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to download PDF." });
    }
  };

  const handleDownloadItemsXlsx = async () => {
    try {
      const success = await downloadSalesItemsXlsx(userId, dateRange, items);
      if (!success) {
        toast({ title: 'No Sales Found', description: 'There are no sales in the selected date range.' });
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
              <CardTitle className="font-headline text-2xl">Record and View Sales</CardTitle>
              <CardDescription>Create new sales transactions and view past sales history.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Button onClick={() => setIsDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Record New Sale
              </Button>
              <div className="flex gap-2 w-full max-w-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search Memo # or Name..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  {searchTerm && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button variant="secondary" onClick={() => handleSearch()} disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
              <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Download Reports
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Download Sales Report</DialogTitle>
                    <DialogDescription>Select a date range to download your sales data.</DialogDescription>
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
                      <p className="text-sm text-muted-foreground">
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              Selected: {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            <>Selected: {format(dateRange.from, "LLL dd, y")}</>
                          )
                        ) : (
                          <span>Please pick a start and end date.</span>
                        )}
                      </p>
                    </div>
                  </ScrollArea>
                  <DialogFooter className="pt-4 border-t">
                    <div className="flex flex-col gap-4 w-full">
                      <div>
                        <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Sales Report</p>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={handleDownloadPdf} disabled={!dateRange?.from} className="flex-1"><FileText className="mr-2 h-4 w-4" /> PDF</Button>
                          <Button variant="outline" onClick={handleDownloadXlsx} disabled={!dateRange?.from} className="flex-1"><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Items Sold Summary</p>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={handleDownloadItemsPdf} disabled={!dateRange?.from} className="flex-1"><FileText className="mr-2 h-4 w-4" /> PDF</Button>
                          <Button variant="outline" onClick={handleDownloadItemsXlsx} disabled={!dateRange?.from} className="flex-1"><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
                        </div>
                      </div>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SalesTable
            userId={userId}
            sales={displaySales}
            items={items}
            customers={customers}
            isInitialLoading={isInitialLoading}
            isSearching={isSearching}
            isPending={isPending}
            onDelete={handleDelete}
            authUser={authUser}
          />
          {hasMore && !searchTerm && (
            <div className="flex justify-center mt-4">
              <Button onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : 'Load More'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <RecordSaleDialog
        userId={userId}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        items={items}
        customers={customers}
        onSuccess={loadInitialData}
        authUser={authUser}
      />
    </>
  );
}
