'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { Purchase } from '@/lib/types';

interface PurchasesTableProps {
  purchases: Purchase[];
  isInitialLoading: boolean;
}

export function PurchasesTable({
  purchases,
  isInitialLoading,
}: PurchasesTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Purchase ID</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Discount</TableHead>
            <TableHead className="text-right">Net</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isInitialLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : purchases.length > 0 ? purchases.map((purchase) => (
            <TableRow key={purchase.id}>
              <TableCell>{format(new Date(purchase.date), 'PPP')}</TableCell>
              <TableCell className="font-mono">{purchase.purchaseId}</TableCell>
              <TableCell className="font-medium">{purchase.supplier}</TableCell>
              <TableCell className="max-w-[300px] truncate">
                {purchase.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ')}
              </TableCell>
              <TableCell>{purchase.paymentMethod}</TableCell>
              <TableCell className="text-right font-medium">৳{purchase.totalAmount.toFixed(2)}</TableCell>
              <TableCell className="text-right text-muted-foreground">{purchase.discountAmount ? `৳${purchase.discountAmount.toFixed(2)}` : '-'}</TableCell>
              <TableCell className="text-right font-bold">৳{(purchase.totalAmount - (purchase.discountAmount || 0)).toFixed(2)}</TableCell>
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No purchases recorded yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
