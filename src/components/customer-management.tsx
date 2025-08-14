
'use client';

import { addCustomer, deleteCustomer, getCustomers, getCustomersPaginated, updateCustomer } from '@/lib/actions';
import { zodResolver } from '@hookform/resolvers/zod';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Edit, FileSpreadsheet, FileText, Loader2, PlusCircle, Search, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import * as XLSX from 'xlsx';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/types';
import { format } from 'date-fns';
import { Skeleton } from './ui/skeleton';
import { Textarea } from './ui/textarea';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  whatsapp: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  openingBalance: z.coerce.number().default(0),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

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
      console.error("Failed to load all customers for search:", error);
    }
  }, [userId]);

  const loadInitialCustomers = React.useCallback(async () => {
      setIsInitialLoading(true);
      try {
        const { customers: refreshedCustomers, hasMore: refreshedHasMore } = await getCustomersPaginated({ userId, pageLimit: 5 });
        setCustomers(refreshedCustomers);
        setHasMore(refreshedHasMore);
      } catch (error) {
        console.error("Failed to load customers:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load customer data. Please try again later.",
        });
      } finally {
        setIsInitialLoading(false);
      }
  }, [userId, toast]);

  React.useEffect(() => {
    if(userId) {
        loadInitialCustomers();
        loadAllCustomers(); // Load all customers for search
    }
  }, [userId, loadInitialCustomers, loadAllCustomers]);

  // Search functionality
  const performSearch = React.useCallback((query: string) => {
    if (!query.trim()) {
      // If search is empty, return to normal pagination
      loadInitialCustomers();
      return;
    }

    setIsSearching(true);
    
    const searchTerms = query.toLowerCase().trim().split(' ').filter(term => term.length > 0);
    
    if (searchTerms.length === 0) {
      loadInitialCustomers();
      return;
    }

    // Filter customers based on search terms
    const searchResults = allCustomers.filter(customer => {
      const customerName = customer.name.toLowerCase();
      
      // Check if customer name contains all search terms
      return searchTerms.every(term => customerName.includes(term));
    });

    // Sort results by relevance (names starting with search terms get highest priority)
    const sortedResults = searchResults.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      
      // Names starting with the FIRST search term get highest priority
      const aStartsWithFirstTerm = aName.startsWith(searchTerms[0]);
      const bStartsWithFirstTerm = bName.startsWith(searchTerms[0]);
      
      if (aStartsWithFirstTerm && !bStartsWithFirstTerm) return -1;
      if (!aStartsWithFirstTerm && bStartsWithFirstTerm) return 1;
      
      // Then prioritize names starting with ANY search term
      const aStartsWithAnyTerm = searchTerms.some(term => aName.startsWith(term));
      const bStartsWithAnyTerm = searchTerms.some(term => bName.startsWith(term));
      
      if (aStartsWithAnyTerm && !bStartsWithAnyTerm) return -1;
      if (!aStartsWithAnyTerm && bStartsWithAnyTerm) return 1;
      
      // Then prioritize names that contain the first term at the beginning of words
      const aHasFirstTermAtWordStart = aName.includes(` ${searchTerms[0]}`) || aName.startsWith(searchTerms[0]);
      const bHasFirstTermAtWordStart = bName.includes(` ${searchTerms[0]}`) || bName.startsWith(searchTerms[0]);
      
      if (aHasFirstTermAtWordStart && !bHasFirstTermAtWordStart) return -1;
      if (!aHasFirstTermAtWordStart && bHasFirstTermAtWordStart) return 1;
      
      // Finally sort alphabetically
      return aName.localeCompare(bName);
    });

    // Limit to top 10 results for performance
    const limitedResults = sortedResults.slice(0, 10);
    
    setCustomers(limitedResults);
    setHasMore(sortedResults.length > 10);
    setIsSearching(false);
  }, [allCustomers, loadInitialCustomers]);

  // Debounced search effect
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300); // 300ms delay for better performance

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
      // For search results, load more from all customers
      const searchTerms = searchQuery.toLowerCase().trim().split(' ').filter(term => term.length > 0);
      const searchResults = allCustomers.filter(customer => {
        const customerName = customer.name.toLowerCase();
        return searchTerms.every(term => customerName.includes(term));
      });
      
      const currentCount = customers.length;
      const nextBatch = searchResults.slice(currentCount, currentCount + 5);
      
      if (nextBatch.length > 0) {
        setCustomers(prev => [...prev, ...nextBatch]);
        setHasMore(currentCount + nextBatch.length < searchResults.length);
      } else {
        setHasMore(false);
      }
    } else {
      // Normal pagination for non-search results
      setIsLoadingMore(true);
      const lastCustomerId = customers[customers.length - 1]?.id;
      try {
          const { customers: newCustomers, hasMore: newHasMore } = await getCustomersPaginated({ userId, pageLimit: 5, lastVisibleId: lastCustomerId });
          setCustomers(prev => [...prev, ...newCustomers]);
          setHasMore(newHasMore);
      } catch (error) {
          console.error("Failed to load more customers:", error);
          toast({
              variant: "destructive",
              title: "Error",
              description: "Could not load more customers.",
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
            // Refresh both search results and all customers
            if (searchQuery.trim()) {
              performSearch(searchQuery);
            } else {
              await loadInitialCustomers();
            }
            await loadAllCustomers();
            toast({ title: "Customer Deleted", description: "The customer has been removed." });
        } catch(e) {
             toast({ variant: "destructive", title: "Error", description: "Could not delete customer." });
        }
    });
  }

  const onSubmit = (data: CustomerFormValues) => {
    startTransition(async () => {
        try {
            if (editingCustomer) {
                await updateCustomer(userId, editingCustomer.id, data);
                toast({ title: "Customer Updated", description: "The customer details have been saved." });
            } else {
                await addCustomer(userId, data);
                toast({ title: "Customer Added", description: "The new customer has been added." });
            }
            // Refresh both search results and all customers
            if (searchQuery.trim()) {
              performSearch(searchQuery);
            } else {
              await loadInitialCustomers();
            }
            await loadAllCustomers();
            setIsDialogOpen(false);
            setEditingCustomer(null);
        } catch(e) {
            toast({ variant: "destructive", title: "Error", description: "Could not save customer." });
        }
    });
  };

  const handleDownloadPdf = () => {
    if (!customers.length || !authUser) return;
    
    const doc = new jsPDF();
    const dateString = format(new Date(), 'PPP');
    
    // Left side header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(authUser.companyName || 'Bookstore', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(authUser.address || '', 14, 26);
    doc.text(authUser.phone || '', 14, 32);

    // Right side header
    let yPos = 20;
    if (authUser.bkashNumber) {
        doc.text(`Bkash: ${authUser.bkashNumber}`, 200, yPos, { align: 'right' });
        yPos += 6;
    }
    if (authUser.bankInfo) {
        doc.text(`Bank: ${authUser.bankInfo}`, 200, yPos, { align: 'right' });
    }

    // Report Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer List', 105, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`As of ${dateString}`, 105, 51, { align: 'center' });
    doc.setTextColor(0);
    
    autoTable(doc, {
      startY: 60,
      head: [['Name', 'Phone', 'Address', 'Due Balance']],
      body: customers.map(c => [c.name, c.phone, c.address, `৳${(c.dueBalance || 0).toFixed(2)}`]),
    });
    
    doc.save(`customer-list-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleDownloadXlsx = () => {
    if (!customers.length) return;
    
    const dataToExport = customers.map(c => ({
      Name: c.name,
      Phone: c.phone,
      WhatsApp: c.whatsapp || '',
      Address: c.address,
      'Due Balance': c.dueBalance || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    const columnWidths = Object.keys(dataToExport[0]).map(key => {
        const maxLength = Math.max(
            ...dataToExport.map(row => String(row[key as keyof typeof row]).length),
            key.length
        );
        return { wch: maxLength + 2 };
    });
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
    XLSX.writeFile(workbook, `customer-list-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // Determine what to display in the table
  const displayCustomers = customers;
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
                {isSearching ? 'Searching...' : `Found ${customers.length} customer${customers.length !== 1 ? 's' : ''} matching "${searchQuery}"`}
              </span>
              <Button variant="ghost" size="sm" onClick={clearSearch}>
                Clear Search
              </Button>
            </div>
          </div>
        )}
        
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isInitialLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-3/4 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : displayCustomers.length > 0 ? (
                displayCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <Link href={`/customers/${customer.id}`} className="hover:underline text-primary">
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.address}</TableCell>
                                            <TableCell className="text-right">৳{(customer.dueBalance || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                       <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)} disabled={isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {searchQuery.trim() ? 'No customers found matching your search.' : 'No customers recorded yet.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {showLoadMore && (
          <div className="flex justify-center mt-4">
            <Button onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading...</> : 'Load More'}
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? 'Update the details for this customer.' : 'Enter the details for the new customer.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto pr-4 pl-1 -mr-4 -ml-1">
                <div className="space-y-4 py-4 px-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="123-456-7890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="123-456-7890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="123 Main St, Anytown, USA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="openingBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opening Due Balance</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter className="pt-4 border-t">
                <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save Customer"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
