'use client';

import * as React from 'react';
import { Gift, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PackageSaleDialog } from '@/components/package-sale-dialog';
import { EditPackageDialog } from './edit-package-dialog';
import type { Item, PackageTemplate } from '@/lib/types';
import type { PackageFormValues } from './schema';
import { Badge } from '@/components/ui/badge';

interface PackagesTableProps {
  packages: PackageTemplate[];
  items: Item[];
  userId: string;
  isInitialLoading: boolean;
  isPending: boolean;
  onDeleteClick: (id: string) => void;
  onUpdateSubmit?: (packageId: string, data: PackageFormValues) => void;
  loadInitialData: () => void;
}

export function PackagesTable({
  packages,
  items,
  userId,
  isInitialLoading,
  isPending,
  onDeleteClick,
  onUpdateSubmit,
  loadInitialData
}: PackagesTableProps) {
  const [editingPackage, setEditingPackage] = React.useState<PackageTemplate | null>(null);
  const getItemTitle = (itemId: string) => items.find(i => i.id === itemId)?.title || 'Unknown Item';

  return (
    <>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Package Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Free Gifts</TableHead>
              <TableHead>Original Value</TableHead>
              <TableHead className="text-right w-[220px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isInitialLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
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
                  <TableCell className="max-w-[200px]">
                    {pkg.gifts && pkg.gifts.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {pkg.gifts.map((g, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 flex items-center gap-1">
                            <Gift className="h-3 w-3" /> {g}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs font-mono">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    ৳{pkg.items.reduce((sum, pkgItem) => {
                      const item = items.find(i => i.id === pkgItem.itemId);
                      return sum + (item?.sellingPrice || 0) * pkgItem.quantity;
                    }, 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <PackageSaleDialog
                      packageTemplate={pkg}
                      items={items}
                      userId={userId}
                      onSaleComplete={loadInitialData}
                    />
                    <Button variant="ghost" size="icon" onClick={() => setEditingPackage(pkg)} title="Edit Package">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteClick(pkg.id)} disabled={isPending} title="Delete Package">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No packages created yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {editingPackage && onUpdateSubmit && (
        <EditPackageDialog
          packageTemplate={editingPackage}
          isOpen={!!editingPackage}
          onOpenChange={(open) => { if (!open) setEditingPackage(null); }}
          items={items}
          isPending={isPending}
          onSubmit={(id, data) => {
            onUpdateSubmit(id, data);
            setEditingPackage(null);
          }}
        />
      )}
    </>
  );
}
