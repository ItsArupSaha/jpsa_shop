'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Pencil } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Purchase } from '@/lib/types';
import { formatTaka } from '@/lib/format';

interface PurchasesTableProps {
  purchases: Purchase[];
  isInitialLoading: boolean;
  onEdit?: (purchase: Purchase) => void;
}

// Asset purchases (PUR-A-...) are recorded through their own dialogs and have
// no catalog item linkage, so they are not editable from this list.
const isEditablePurchase = (purchase: Purchase) =>
  !purchase.purchaseId.startsWith('PUR-A-') &&
  purchase.supplier !== 'Asset Purchase' &&
  purchase.supplier !== 'Existing Asset';

export function PurchasesTable({
  purchases,
  isInitialLoading,
  onEdit,
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
            <TableHead className="text-right">Actions</TableHead>
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
              <TableCell className="text-right font-medium">{formatTaka(purchase.totalAmount.toFixed(2))}</TableCell>
              <TableCell className="text-right text-muted-foreground">{purchase.discountAmount ? `৳${purchase.discountAmount.toFixed(2)}` : '-'}</TableCell>
              <TableCell className="text-right font-bold">{formatTaka((purchase.totalAmount - (purchase.discountAmount || 0)).toFixed(2))}</TableCell>
              <TableCell className="text-right">
                {onEdit && isEditablePurchase(purchase) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${purchase.purchaseId}`}
                    onClick={() => onEdit(purchase)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No purchases recorded yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
