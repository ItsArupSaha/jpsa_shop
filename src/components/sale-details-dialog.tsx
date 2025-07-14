'use client';

import type { Book, Sale } from '@/lib/types';
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

interface SaleDetailsDialogProps {
  sale: Sale;
  books: Book[];
  children: React.ReactNode;
}

export function SaleDetailsDialog({ sale, books, children }: SaleDetailsDialogProps) {
  const getBookTitle = (bookId: string) => books.find(b => b.id === bookId)?.title || 'Unknown Book';
  
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sale Details</DialogTitle>
          <DialogDescription>
            List of items sold in this transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Book Title</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sale.items.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-medium">{getBookTitle(item.bookId)}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${(item.quantity * item.price).toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Separator className="my-4" />
            <div className="space-y-2 text-sm pr-4">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${sale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span>-${(sale.subtotal - sale.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>${sale.total.toFixed(2)}</span>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
