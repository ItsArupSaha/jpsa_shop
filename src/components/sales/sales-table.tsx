'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTaka } from '@/lib/format';
import type { Sale, Item, Customer } from '@/lib/types';
import { DownloadSaleMemo } from '../download-sale-memo';
import { SaleDetailsDialog } from '../sale-details-dialog';

type SaleStatus = {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  dueAmount?: number;
};

interface SalesTableProps {
  sales: Sale[];
  items: Item[];
  customers: Customer[];
  /** Remaining unpaid amount per sale id (loaded once by the parent). */
  pendingDues: Record<string, number>;
  isInitialLoading: boolean;
  isSearching: boolean;
  isPending: boolean;
  onDelete: (sale: Sale) => void;
  authUser: any;
}

function getOriginalDueAmount(sale: Sale) {
  if (sale.paymentMethod === 'Due') {
    return Math.max(0, sale.total - (sale.creditApplied || 0));
  }
  if (sale.paymentMethod === 'Split') {
    return Math.max(0, sale.total - (sale.creditApplied || 0) - (sale.amountPaid || 0));
  }
  return 0;
}

function getSaleStatus(sale: Sale, remainingDue: number | undefined): SaleStatus {
  switch (sale.paymentMethod) {
    case 'Cash':
      return { label: 'Cash', variant: 'default' };
    case 'Bank':
      return { label: 'Bank', variant: 'default' };
    case 'Paid by Credit':
      return { label: 'Credit', variant: 'default' };
    case 'Due':
    case 'Split': {
      const originalDue = getOriginalDueAmount(sale);
      if (originalDue <= 0.005) {
        return { label: 'Paid', variant: 'default' };
      }
      // A Due/Split sale missing from the pending list has been settled in full.
      const remaining = remainingDue === undefined ? 0 : remainingDue;
      if (remaining <= 0.005) {
        return { label: 'Paid', variant: 'default' };
      }
      if (remaining + 0.005 < originalDue || sale.paymentMethod === 'Split') {
        return { label: 'Partial Due', variant: 'secondary', dueAmount: remaining };
      }
      return { label: 'Due', variant: 'destructive', dueAmount: remaining };
    }
    default:
      return { label: sale.paymentMethod, variant: 'outline' };
  }
}

export function SalesTable({
  sales,
  items,
  customers,
  pendingDues,
  isInitialLoading,
  isSearching,
  isPending,
  onDelete,
  authUser,
}: SalesTableProps) {
  const getItemTitle = (itemId: string) => items.find(i => i.id === itemId)?.title || 'Unknown Item';

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Sale ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="hidden lg:table-cell">Items</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isInitialLoading || isSearching ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : sales.length > 0 ? sales.map((sale) => {
            const customer = customers.find(c => c.id === sale.customerId);
            const status = getSaleStatus(sale, pendingDues[sale.saleId]);
            return (
              <TableRow key={sale.id}>
                <TableCell className="whitespace-nowrap">{format(new Date(sale.date), 'dd MMM yyyy')}</TableCell>
                <TableCell className="font-mono">{sale.saleId}</TableCell>
                <TableCell className="font-medium">{customer?.name || 'Unknown Customer'}</TableCell>
                <TableCell className="max-w-[300px] hidden lg:table-cell">
                  {sale.items.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span>
                        {sale.items[0].quantity}x {getItemTitle(sale.items[0].itemId)}
                      </span>
                      {sale.items.length > 1 && (
                        <SaleDetailsDialog sale={sale} items={items}>
                          <Badge variant="secondary" className="cursor-pointer hover:bg-muted">
                            +{sale.items.length - 1} more
                          </Badge>
                        </SaleDetailsDialog>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
                    {status.dueAmount !== undefined && status.dueAmount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Due: {formatTaka(status.dueAmount)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">{formatTaka(sale.total)}</TableCell>
                <TableCell className="text-right">
                  {customer && authUser && (
                    <DownloadSaleMemo sale={sale} customer={customer} items={items} user={authUser} />
                  )}
                  <Button variant="ghost" size="icon" aria-label={`Delete ${sale.saleId}`} onClick={() => onDelete(sale)} disabled={isPending}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          }) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No sales recorded yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
