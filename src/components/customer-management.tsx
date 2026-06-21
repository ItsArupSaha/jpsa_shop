'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Download, FileSpreadsheet, FileText, Loader2, PlusCircle, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { addCustomer, deleteCustomer, getCustomers, getCustomersPaginated, updateCustomer } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/types';

import { customerSchema, type CustomerFormValues } from './customers/schema';
import { AddCustomerDialog } from './customers/add-customer-dialog';
import { exportCustomersToPdf, exportCustomersToXlsx } from './customers/customers-export-utils';
import { CustomersTable } from './customers/customers-table';

interface CustomerManagementProps {
  userId: string;
}

export default function CustomerManagement({ userId }: CustomerManagementProps) {
  const { authUser } = useAuth();
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = React.useState<Customer[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  // Load all customers for search functionality
  const loadAllCustomers = React.useCallback(async () => {
    try {
      const allCustomersData = await getCustomers(userId);
      setAllCustomers(allCustomersData);
    } catch (error) {
      console.error('Failed to load all customers for search:', error);
    }
  }, [userId]);

  const loadInitialCustomers = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const { customers: refreshedCustomers, hasMore: refreshedHasMore } =
        await getCustomersPaginated({ userId, pageLimit: 5 });
      setCustomers(refreshedCustomers);
      setHasMore(refreshedHasMore);
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not load customer data. Please try again later.',
      });
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadInitialCustomers();
      loadAllCustomers();
    }
  }, [userId, loadInitialCustomers, loadAllCustomers]);

  // Search functionality
  const performSearch = React.useCallback(
    (query: string) => {
      if (!query.trim()) {
        loadInitialCustomers();
        return;
      }

      setIsSearching(true);

      const searchTerms = query
        .toLowerCase()
        .trim()
        .split(' ')
        .filter((term) => term.length > 0);

      if (searchTerms.length === 0) {
        loadInitialCustomers();
        return;
      }

      const searchResults = allCustomers.filter((customer) => {
        const customerName = customer.name.toLowerCase();
        return searchTerms.every((term) => customerName.includes(term));
      });

      const sortedResults = searchResults.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        const aStartsWithFirstTerm = aName.startsWith(searchTerms[0]);
        const bStartsWithFirstTerm = bName.startsWith(searchTerms[0]);

        if (aStartsWithFirstTerm && !bStartsWithFirstTerm) return -1;
        if (!aStartsWithFirstTerm && bStartsWithFirstTerm) return 1;

        const aStartsWithAnyTerm = searchTerms.some((term) => aName.startsWith(term));
        const bStartsWithAnyTerm = searchTerms.some((term) => bName.startsWith(term));

        if (aStartsWithAnyTerm && !bStartsWithAnyTerm) return -1;
        if (!aStartsWithAnyTerm && bStartsWithAnyTerm) return 1;

        const aHasFirstTermAtWordStart = aName.includes(` ${searchTerms[0]}`) || aName.startsWith(searchTerms[0]);
        const bHasFirstTermAtWordStart = bName.includes(` ${searchTerms[0]}`) || bName.startsWith(searchTerms[0]);

        if (aHasFirstTermAtWordStart && !bHasFirstTermAtWordStart) return -1;
        if (!aHasFirstTermAtWordStart && bHasFirstTermAtWordStart) return 1;

        return aName.localeCompare(bName);
      });

      const limitedResults = sortedResults.slice(0, 10);

      setCustomers(limitedResults);
      setHasMore(sortedResults.length > 10);
      setIsSearching(false);
    },
    [allCustomers, loadInitialCustomers]
  );

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    loadInitialCustomers();
  };

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;

    if (searchQuery.trim()) {
      const searchTerms = searchQuery
        .toLowerCase()
        .trim()
        .split(' ')
        .filter((term) => term.length > 0);
      const searchResults = allCustomers.filter((customer) => {
        const customerName = customer.name.toLowerCase();
        return searchTerms.every((term) => customerName.includes(term));
      });

      const currentCount = customers.length;
      const nextBatch = searchResults.slice(currentCount, currentCount + 5);

      if (nextBatch.length > 0) {
        setCustomers((prev) => [...prev, ...nextBatch]);
        setHasMore(currentCount + nextBatch.length < searchResults.length);
      } else {
        setHasMore(false);
      }
    } else {
      setIsLoadingMore(true);
      const lastCustomerId = customers[customers.length - 1]?.id;
      try {
        const { customers: newCustomers, hasMore: newHasMore } = await getCustomersPaginated({
          userId,
          pageLimit: 5,
          lastVisibleId: lastCustomerId,
        });
        setCustomers((prev) => [...prev, ...newCustomers]);
        setHasMore(newHasMore);
      } catch (error) {
        console.error('Failed to load more customers:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load more customers.',
        });
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      phone: '',
      whatsapp: '',
      address: '',
      openingBalance: 0,
    },
  });

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset(customer);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingCustomer(null);
    form.reset({ name: '', phone: '', whatsapp: '', address: '', openingBalance: 0 });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteCustomer(userId, id);
        if (searchQuery.trim()) {
          performSearch(searchQuery);
        } else {
          await loadInitialCustomers();
        }
        await loadAllCustomers();
        toast({ title: 'Customer Deleted', description: 'The customer has been removed.' });
      } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete customer.' });
      }
    });
  };

  const onSubmit = (data: CustomerFormValues) => {
    startTransition(async () => {
      try {
        if (editingCustomer) {
          await updateCustomer(userId, editingCustomer.id, data);
          toast({ title: 'Customer Updated', description: 'The customer details have been saved.' });
        } else {
          await addCustomer(userId, data);
          toast({ title: 'Customer Added', description: 'The new customer has been added.' });
        }
        if (searchQuery.trim()) {
          performSearch(searchQuery);
        } else {
          await loadInitialCustomers();
        }
        await loadAllCustomers();
        setIsDialogOpen(false);
        setEditingCustomer(null);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not save customer.';
        toast({ variant: 'destructive', title: 'Duplicate Customer', description: message });
      }
    });
  };

  const handleDownloadPdf = () => {
    exportCustomersToPdf(allCustomers, authUser);
  };

  const handleDownloadXlsx = () => {
    exportCustomersToXlsx(allCustomers);
  };

  const showLoadMore = hasMore && customers.length > 0;

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-2xl">Customer List</CardTitle>
            <CardDescription>Manage your customer information and balances.</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Customer
            </Button>
            {/* Search Input */}
            <div className="relative w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-10 min-w-[180px] max-w-[220px]"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                  onClick={clearSearch}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                <FileText className="mr-2 h-4 w-4" /> Download PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadXlsx}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Status */}
        {searchQuery.trim() && (
          <div className="mb-4 p-3 bg-muted rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {isSearching
                  ? 'Searching...'
                  : `Found ${customers.length} customer${customers.length !== 1 ? 's' : ''} matching "${searchQuery}"`}
              </span>
              <Button variant="ghost" size="sm" onClick={clearSearch}>
                Clear Search
              </Button>
            </div>
          </div>
        )}

        <CustomersTable
          customers={customers}
          isLoading={isInitialLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isPending={isPending}
          searchQuery={searchQuery}
        />

        {showLoadMore && (
          <div className="flex justify-center mt-4">
            <Button onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </CardContent>

      <AddCustomerDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        form={form}
        onSubmit={onSubmit}
        isPending={isPending}
        editingCustomer={editingCustomer}
      />
    </Card>
  );
}
