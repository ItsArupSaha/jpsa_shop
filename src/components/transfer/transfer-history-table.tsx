'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { Transfer } from '@/lib/types';

interface TransferHistoryTableProps {
  transfers: Transfer[];
  isLoadingTransfers: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  formatCurrency: (amount: number) => string;
}

export function TransferHistoryTable({
  transfers,
  isLoadingTransfers,
  hasMore,
  isLoadingMore,
  onLoadMore,
  formatCurrency
}: TransferHistoryTableProps) {
  return (
    <div className="space-y-4">
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingTransfers ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : transfers.length > 0 ? (
              transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>{format(new Date(transfer.date), 'PPP')}</TableCell>
                  <TableCell>{transfer.description}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(transfer.amount)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">No transfers recorded yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={onLoadMore} disabled={isLoadingMore}>
            {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
