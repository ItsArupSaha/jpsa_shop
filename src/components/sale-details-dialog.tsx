'use client';

import type { Item, Sale } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from './ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { getSaleTransaction } from '@/lib/actions';
import React from 'react';

interface SaleDetailsDialogProps {
  sale: Sale;
  items: Item[];
  children: React.ReactNode;
}

export function SaleDetailsDialog({ sale, items, children }: SaleDetailsDialogProps) {
  const { authUser } = useAuth();
  const [currentDue, setCurrentDue] = React.useState<number | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const getItemTitle = (itemId: string) => items.find((i: Item) => i.id === itemId)?.title || 'Unknown Item';

  const fetchStatus = async () => {
    if (!authUser || (sale.paymentMethod !== 'Due' && sale.paymentMethod !== 'Split')) return;

    setLoading(true);
    try {
      const transaction = await getSaleTransaction(authUser.uid, sale.saleId);
      if (transaction) {
        setCurrentDue(transaction.status === 'Paid' ? 0 : transaction.amount);
        setStatus(transaction.status);
      }
    } catch (e) {
      console.error("Failed to fetch sale status", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog onOpenChange={(open) => { if (open) fetchStatus(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sale Details ({sale.saleId})</DialogTitle>
          <DialogDescription>
            Recorded on {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(sale.date))}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Title</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{getItemTitle(item.itemId)}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">৳{item.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">৳{(item.quantity * item.price).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Separator className="my-4" />
          <div className="space-y-2 text-sm pr-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>৳{sale.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Discount</span>
              <span>-৳{(sale.subtotal - sale.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-b pb-2">
              <span>Grand Total</span>
              <span>৳{sale.total.toFixed(2)}</span>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Original Payment:</span>
                <span className="font-medium">{sale.paymentMethod}</span>
              </div>
              {loading ? (
                <div className="text-xs text-muted-foreground animate-pulse mt-1">Checking current status...</div>
              ) : status && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-muted-foreground">Current Status:</span>
                  <span className={status === 'Paid' ? "text-green-600 font-bold" : "text-destructive font-bold"}>
                    {status === 'Paid' ? 'PAID' : `DUE: ৳${currentDue?.toFixed(2)}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
