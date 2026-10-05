'use client';

import { addSalesReturn, getCustomers, getItems, getSalesReturns } from '@/lib/actions';
import { PlusCircle, Search, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Customer, Item, SalesReturn } from '@/lib/types';
import { SalesReturnsTable } from './sales-return/sales-returns-table';
import { RecordReturnDialog } from './sales-return/record-return-dialog';
import type { SalesReturnFormValues } from './sales-return/schema';

interface SalesReturnManagementProps {
    userId: string;
}

const PAGE_SIZE = 10;

export default function SalesReturnManagement({ userId }: SalesReturnManagementProps) {
  const [allReturns, setAllReturns] = React.useState<SalesReturn[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
        const [returnsData, itemsData, customersData] = await Promise.all([
            getSalesReturns(userId),
            getItems(userId),
            getCustomers(userId),
        ]);
        setAllReturns(returnsData);
        setItems(itemsData);
        setCustomers(customersData);
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not load data." });
    } finally {
        setIsInitialLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if(userId) loadInitialData();
  }, [userId, loadInitialData]);

  const customerName = React.useCallback((customerId: string) => {
    return customers.find(c => c.id === customerId)?.name || '';
  }, [customers]);

  const filteredReturns = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allReturns;
    return allReturns.filter(ret =>
      ret.returnId.toLowerCase().includes(q) ||
      customerName(ret.customerId).toLowerCase().includes(q)
    );
  }, [allReturns, searchQuery, customerName]);

  const visibleReturns = React.useMemo(
    () => filteredReturns.slice(0, visibleCount),
    [filteredReturns, visibleCount]
  );
  const hasMore = visibleCount < filteredReturns.length;

  const handleAddNew = () => {
    setIsDialogOpen(true);
  };

  const onSubmit = (data: SalesReturnFormValues) => {
    startTransition(async () => {
      const result = await addSalesReturn(userId, {
        ...data,
        date: data.date.toISOString(),
      });
      if (result?.success && result.salesReturn) {
        toast({ title: 'Return Recorded', description: 'The sales return has been successfully processed.' });
        loadInitialData();
        setIsDialogOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to record return.' });
      }
    });
  };

  return (
    <>
      <Card className="animate-in fade-in-50">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <CardTitle className="font-headline text-2xl">Sales Returns</CardTitle>
              <CardDescription>Manage customer returns and update their balance.</CardDescription>
            </div>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Record New Return
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search returns by ID or customer..."
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
            <p className="text-sm text-muted-foreground md:py-2">{filteredReturns.length} return(s)</p>
          </div>

          <SalesReturnsTable
            returns={visibleReturns}
            items={items}
            customers={customers}
            isInitialLoading={isInitialLoading}
            isLoadingMore={false}
            hasMore={hasMore}
            onLoadMore={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          />
        </CardContent>
      </Card>

      <RecordReturnDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        items={items}
        customers={customers}
        isPending={isPending}
        onSubmit={onSubmit}
      />
    </>
  );
}
