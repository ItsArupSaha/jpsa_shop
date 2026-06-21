'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Sale, Item, Customer, Transaction } from '@/lib/types';
import { getSaleTransaction } from '@/lib/actions';
import { DownloadSaleMemo } from '../download-sale-memo';
import { SaleDetailsDialog } from '../sale-details-dialog';
import { cn } from '@/lib/utils';

type SaleStatus = {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  dueAmount?: number;
};

interface SalesTableProps {
  userId: string;
  sales: Sale[];
  items: Item[];
  customers: Customer[];
  isInitialLoading: boolean;
  isSearching: boolean;
  isPending: boolean;
  onDelete: (id: string) => void;
  authUser: any;
}

function getOriginalDueAmount(sale: Sale) {
  if (sale.paymentMethod === 'Due') {
    return sale.total;
  }
  if (sale.paymentMethod === 'Split') {
    return Math.max(0, sale.total - (sale.amountPaid || 0));
  }
  return 0;
}

function getImmediateSaleStatus(sale: Sale): SaleStatus {
  switch (sale.paymentMethod) {
    case 'Cash':
      return { label: 'Cash', variant: 'default' };
    case 'Bank':
      return { label: 'Bank', variant: 'default' };
    case 'Paid by Credit':
      return { label: 'Credit', variant: 'default' };
    case 'Due':
      return { label: 'Due', variant: 'destructive', dueAmount: sale.total };
    case 'Split':
      return {
        label: 'Partial Due',
        variant: 'secondary',
        dueAmount: Math.max(0, sale.total - (sale.amountPaid || 0)),
      };
    default:
      return { label: sale.paymentMethod, variant: 'outline' };
  }
}

function getResolvedSaleStatus(sale: Sale, transaction: Transaction | null): SaleStatus {
  if (sale.paymentMethod !== 'Due' && sale.paymentMethod !== 'Split') {
    return getImmediateSaleStatus(sale);
  }

  const originalDueAmount = getOriginalDueAmount(sale);

  if (!transaction) {
    return getImmediateSaleStatus(sale);
  }

  if (transaction.status === 'Paid' || transaction.amount <= 0) {
    return { label: 'Paid', variant: 'default' };
  }

  if (sale.paymentMethod === 'Split' || transaction.amount < originalDueAmount) {
    return {
      label: 'Partial Due',
      variant: 'secondary',
      dueAmount: transaction.amount,
    };
  }

  return {
    label: 'Due',
    variant: 'destructive',
    dueAmount: transaction.amount,
  };
}

export function SalesTable({
  userId,
  sales,
  items,
  customers,
  isInitialLoading,
  isSearching,
  isPending,
  onDelete,
  authUser,
}: SalesTableProps) {
  const [saleStatuses, setSaleStatuses] = React.useState<Record<string, SaleStatus>>({});

  const getItemTitle = (itemId: string) => items.find(i => i.id === itemId)?.title || 'Unknown Item';

  React.useEffect(() => {
    let isCancelled = false;

    async function loadSaleStatuses() {
      const nextStatuses: Record<string, SaleStatus> = {};

      await Promise.all(
        sales.map(async (sale) => {
          if (sale.paymentMethod !== 'Due' && sale.paymentMethod !== 'Split') {
            nextStatuses[sale.id] = getImmediateSaleStatus(sale);
            return;
          }

          try {
            const transaction = await getSaleTransaction(userId, sale.saleId);
            nextStatuses[sale.id] = getResolvedSaleStatus(sale, transaction);
          } catch (error) {
            console.error(`Failed to resolve live status for ${sale.saleId}:`, error);
            nextStatuses[sale.id] = getImmediateSaleStatus(sale);
          }
        })
      );

      if (!isCancelled) {
        setSaleStatuses(nextStatuses);
      }
    }

    if (sales.length === 0) {
      setSaleStatuses({});
      return () => {
        isCancelled = true;
      };
    }

    loadSaleStatuses();

    return () => {
      isCancelled = true;
    };
  }, [sales, userId]);

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Sale ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Items</TableHead>
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
            return (
              <TableRow key={sale.id}>
                <TableCell>{format(new Date(sale.date), 'PPP')}</TableCell>
                <TableCell className="font-mono">{sale.saleId}</TableCell>
                <TableCell className="font-medium">{customer?.name || 'Unknown Customer'}</TableCell>
                <TableCell className="max-w-[300px]">
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
                    <Badge variant={saleStatuses[sale.id]?.variant || 'outline'}>
                      {saleStatuses[sale.id]?.label || sale.paymentMethod}
                    </Badge>
                    {saleStatuses[sale.id]?.dueAmount !== undefined && saleStatuses[sale.id].dueAmount! > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Due: ৳{saleStatuses[sale.id].dueAmount!.toFixed(2)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">৳{sale.total.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  {customer && authUser && (
                    <DownloadSaleMemo sale={sale} customer={customer} items={items} user={authUser} />
                  )}
                  <Button variant="ghost" size="icon" onClick={() => onDelete(sale.id)} disabled={isPending}>
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
