'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Edit, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Item } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ItemsTableProps {
  items: Item[];
  isInitialLoading: boolean;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}

export function ItemsTable({
  items,
  isInitialLoading,
  onEdit,
  onDelete,
  isPending,
}: ItemsTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Author / Group</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Expiry Date</TableHead>
            <TableHead className="text-right">Prod. Price</TableHead>
            <TableHead className="text-right">Selling Price</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isInitialLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-3/4 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : items.length > 0 ? (
            items.map((item) => {
              const now = new Date();
              const oneMonthFromNow = new Date();
              oneMonthFromNow.setDate(now.getDate() + 30);
              const isExpired = item.expiryDate && new Date(item.expiryDate) <= now;
              const isExpiringSoon = item.expiryDate && !isExpired && new Date(item.expiryDate) <= oneMonthFromNow;

              return (
                <TableRow key={item.id} className={cn(
                  isExpired ? 'bg-destructive/10 hover:bg-destructive/15' : isExpiringSoon ? 'bg-amber-500/10 hover:bg-amber-500/15' : ''
                )}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{item.title}</span>
                      {isExpired && <span className="text-[10px] text-destructive font-bold uppercase tracking-wider mt-0.5">Expired</span>}
                      {isExpiringSoon && <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-0.5">Expiring Soon</span>}
                    </div>
                  </TableCell>
                  <TableCell>{item.categoryName}</TableCell>
                  <TableCell>{item.author || item.medicineGroup || '-'}</TableCell>
                  <TableCell>{item.company || '-'}</TableCell>
                  <TableCell className={cn(
                    isExpired ? 'text-destructive font-semibold' : isExpiringSoon ? 'text-amber-600 font-semibold' : ''
                  )}>
                    {item.expiryDate ? format(new Date(item.expiryDate), 'yyyy-MM-dd') : '-'}
                  </TableCell>
                  <TableCell className="text-right">৳{item.productionPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">৳{item.sellingPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{item.stock}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} disabled={isPending}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                No items found matching your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
