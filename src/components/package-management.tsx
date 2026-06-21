'use client';

import { addPackage, deletePackage, getItems, getPackages } from '@/lib/actions';
import { Package as PackageIcon, PlusCircle } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Item, PackageTemplate } from '@/lib/types';
import { PackagesTable } from './packages/packages-table';
import { CreatePackageDialog } from './packages/create-package-dialog';
import type { PackageFormValues } from './packages/schema';

interface PackageManagementProps {
  userId: string;
}

export default function PackageManagement({ userId }: PackageManagementProps) {
  const [packages, setPackages] = React.useState<PackageTemplate[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const [packagesData, itemsData] = await Promise.all([
        getPackages(userId),
        getItems(userId),
      ]);
      setPackages(packagesData);
      setItems(itemsData);
    } catch (error) {
      console.error("Failed to load package data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load data. Please try again later.",
      });
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadInitialData();
    }
  }, [userId, loadInitialData]);

  const handleAddNew = () => {
    setIsDialogOpen(true);
  };

  const handleDelete = (packageId: string) => {
    startTransition(async () => {
      const result = await deletePackage(userId, packageId);
      if (result.success) {
        toast({ title: 'Package Deleted', description: 'The package template has been removed.' });
        loadInitialData();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to delete package.' });
      }
    });
  };

  const onSubmit = (data: PackageFormValues) => {
    startTransition(async () => {
      const result = await addPackage(userId, data);
      if (result.success) {
        toast({ title: 'Package Created', description: 'The new package template has been saved.' });
        loadInitialData();
        setIsDialogOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to create package.' });
      }
    });
  };

  return (
    <>
      <Card className="animate-in fade-in-50">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <PackageIcon className="h-6 w-6" /> Package Management
              </CardTitle>
              <CardDescription>Create reusable bundles to sell quickly at an offered price.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Package
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PackagesTable
            packages={packages}
            items={items}
            userId={userId}
            isInitialLoading={isInitialLoading}
            isPending={isPending}
            onDeleteClick={handleDelete}
            loadInitialData={loadInitialData}
          />
        </CardContent>
      </Card>

      <CreatePackageDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        items={items}
        isPending={isPending}
        onSubmit={onSubmit}
      />
    </>
  );
}
