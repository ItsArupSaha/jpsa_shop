'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { SalesReturn, Item, Customer } from '@/lib/types';

interface SalesReturnsTableProps {
  returns: SalesReturn[];
  items: Item[];
  customers: Customer[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function SalesReturnsTable({
  returns,
  items,
  customers,
  isInitialLoading,
  isLoadingMore,
  hasMore,
  onLoadMore
}: SalesReturnsTableProps) {
  const getItemTitle = (itemId: string) => items.find(i => i.id === itemId)?.title || 'Unknown Item';
  const getCustomerName = (customerId: string) => customers.find(c => c.id === customerId)?.name || 'Unknown Customer';

  return (
    <div className="space-y-4">
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Return ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items Returned</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isInitialLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : returns.length > 0 ? (
              returns.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{format(new Date(r.date), 'PPP')}</TableCell>
                  <TableCell className="font-mono">{r.returnId}</TableCell>
                  <TableCell className="font-medium">{getCustomerName(r.customerId)}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {r.items.map(i => `${i.quantity}x ${getItemTitle(i.itemId)}`).join(', ')}
                  </TableCell>
                  <TableCell className="text-right font-medium">৳{r.totalReturnValue.toFixed(2)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No returns recorded yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button onClick={onLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading...</> : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}
