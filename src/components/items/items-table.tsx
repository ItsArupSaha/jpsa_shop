'use client';

import * as React from 'react';
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
import { formatTaka } from '@/lib/format';
import type { Item } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ItemsTableProps {
  items: Item[];
  isInitialLoading: boolean;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
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
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="hidden lg:table-cell">Author</TableHead>
            <TableHead className="text-right">Cost Price</TableHead>
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
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-5 w-3/4 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : items.length > 0 ? (
            items.map((item) => (
              <TableRow key={item.id} className={cn(item.stock <= 0 && 'text-muted-foreground')}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    {item.stock <= 0 && (
                      <span className="text-[10px] text-destructive font-bold uppercase tracking-wider mt-0.5">Out of Stock</span>
                    )}
                    {item.stock > 0 && item.stock <= 5 && (
                      <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-0.5">Low Stock</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{item.categoryName}</TableCell>
                <TableCell className="hidden lg:table-cell">{item.author || '-'}</TableCell>
                <TableCell className="text-right">{formatTaka(item.productionPrice)}</TableCell>
                <TableCell className="text-right">{formatTaka(item.sellingPrice)}</TableCell>
                <TableCell className="text-right font-medium">{item.stock}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${item.title}`} onClick={() => onEdit(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${item.title}`} onClick={() => onDelete(item)} disabled={isPending}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No items found matching your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
