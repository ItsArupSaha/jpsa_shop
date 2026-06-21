'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PackageSaleDialog } from '@/components/package-sale-dialog';
import type { Item, PackageTemplate } from '@/lib/types';

interface PackagesTableProps {
  packages: PackageTemplate[];
  items: Item[];
  userId: string;
  isInitialLoading: boolean;
  isPending: boolean;
  onDeleteClick: (id: string) => void;
  loadInitialData: () => void;
}

export function PackagesTable({
  packages,
  items,
  userId,
  isInitialLoading,
  isPending,
  onDeleteClick,
  loadInitialData
}: PackagesTableProps) {
  const getItemTitle = (itemId: string) => items.find(i => i.id === itemId)?.title || 'Unknown Item';

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Package Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Original Value</TableHead>
            <TableHead className="text-right w-[180px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isInitialLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-full" /></TableCell>
              </TableRow>
            ))
          ) : packages.length > 0 ? (
            packages.map((pkg) => (
              <TableRow key={pkg.id}>
                <TableCell className="font-medium">{pkg.name}</TableCell>
                <TableCell className="text-muted-foreground">{pkg.description || '-'}</TableCell>
                <TableCell className="max-w-[250px] truncate" title={pkg.items.map(i => `${i.quantity}x ${getItemTitle(i.itemId)}`).join(', ')}>
                  {pkg.items.map(i => `${i.quantity}x ${getItemTitle(i.itemId)}`).join(', ')}
                </TableCell>
                <TableCell className="font-semibold text-primary">
                  ৳{pkg.items.reduce((sum, pkgItem) => {
                    const item = items.find(i => i.id === pkgItem.itemId);
                    return sum + (item?.sellingPrice || 0) * pkgItem.quantity;
                  }, 0).toFixed(2)}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <PackageSaleDialog
                    packageTemplate={pkg}
                    items={items}
                    userId={userId}
                    onSaleComplete={loadInitialData}
                  />
                  <Button variant="ghost" size="icon" onClick={() => onDeleteClick(pkg.id)} disabled={isPending}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No packages created yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
