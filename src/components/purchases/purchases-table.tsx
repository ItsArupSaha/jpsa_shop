'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Pencil } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Purchase } from '@/lib/types';
import type { PurchaseSettlementSummary } from '@/lib/db/purchases';
import { formatTaka } from '@/lib/format';

interface PurchasesTableProps {
  purchases: Purchase[];
  isInitialLoading: boolean;
  settlements: Record<string, PurchaseSettlementSummary>;
  onEdit?: (purchase: Purchase) => void;
}

// Asset purchases (PUR-A-...) are recorded through their own dialogs and have
// no catalog item linkage, so they are not editable from this list.
const isAssetPurchase = (purchase: Purchase) =>
  purchase.purchaseId.startsWith('PUR-A-') ||
  purchase.supplier === 'Asset Purchase' ||
  purchase.supplier === 'Existing Asset';

// Amounts are rounded to 2 decimals before any comparison or display so
// floating-point dust can never turn a settled balance into a false due.
const round2 = (value: number) => Math.round(value * 100) / 100;

export function PurchasesTable({
  purchases,
  isInitialLoading,
  settlements,
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
            <TableHead className="text-right">Net</TableHead>
            <TableHead className="text-right">Paid / Due</TableHead>
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
          ) : purchases.length > 0 ? purchases.map((purchase) => {
            const net = purchase.totalAmount - (purchase.discountAmount || 0);
            // The pending payable documents are the live truth of what is
            // owed (they are what the payables page shows); paid is derived,
            // never reconstructed from the purchase record.
            const due = round2(settlements[purchase.purchaseId]?.dueAmount || 0);
            const paid = round2(net - due);
            return (
              <TableRow key={purchase.id}>
                <TableCell>{format(new Date(purchase.date), 'PPP')}</TableCell>
                <TableCell className="font-mono">{purchase.purchaseId}</TableCell>
                <TableCell className="font-medium">{purchase.supplier}</TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {purchase.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ')}
                </TableCell>
                <TableCell>{purchase.paymentMethod}</TableCell>
                <TableCell className="text-right font-medium">{formatTaka(purchase.totalAmount.toFixed(2))}</TableCell>
                <TableCell className="text-right font-bold">{formatTaka(net.toFixed(2))}</TableCell>
                <TableCell className="text-right">
                  {isAssetPurchase(purchase) ? (
                    <span className="text-muted-foreground">-</span>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="font-medium">{formatTaka(paid.toFixed(2))}</span>
                      {due > 0 ? (
                        <span className="text-xs text-destructive">Due: {formatTaka(due.toFixed(2))}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Paid in full</span>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {onEdit && !isAssetPurchase(purchase) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${purchase.purchaseId}`}
                      title={`Edit ${purchase.purchaseId}`}
                      onClick={() => onEdit(purchase)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          }) : (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No purchases recorded yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
