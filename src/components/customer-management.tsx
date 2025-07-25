
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Edit, Trash2, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { getCustomersPaginated, addCustomer, updateCustomer, deleteCustomer } from '@/lib/actions';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import Link from 'next/link';

import type { Customer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from './ui/textarea';
import { Skeleton } from './ui/skeleton';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  whatsapp: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  openingBalance: z.coerce.number().default(0),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function CustomerManagement() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const loadInitialCustomers = React.useCallback(async () => {
      setIsInitialLoading(true);
      try {
        const { customers: refreshedCustomers, hasMore: refreshedHasMore } = await getCustomersPaginated({ pageLimit: 5 });
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
  }, [toast]);

  React.useEffect(() => {
    loadInitialCustomers();
  }, [loadInitialCustomers]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastCustomerId = customers[customers.length - 1]?.id;
    try {
        const { customers: newCustomers, hasMore: newHasMore } = await getCustomersPaginated({ pageLimit: 5, lastVisibleId: lastCustomerId });
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
            await deleteCustomer(id);
            await loadInitialCustomers();
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
                await updateCustomer(editingCustomer.id, data);
                toast({ title: "Customer Updated", description: "The customer details have been saved." });
            } else {
                await addCustomer(data);
                toast({ title: "Customer Added", description: "The new customer has been added." });
            }
            await loadInitialCustomers();
            setIsDialogOpen(false);
            setEditingCustomer(null);
        } catch(e) {
            toast({ variant: "destructive", title: "Error", description: "Could not save customer." });
        }
    });
  };

  const handleDownloadPdf = () => {
    if (!customers.length) return;
    
    const doc = new jsPDF();
    doc.text(`Customer List (Visible)`, 14, 15);
    
    autoTable(doc, {
      startY: 20,
      head: [['Name', 'Phone', 'Address', 'Due Balance']],
      body: customers.map(c => [c.name, c.phone, c.address, `$${(c.dueBalance || 0).toFixed(2)}`]),
    });
    
    doc.save(`customer-list.pdf`);
  };

  const handleDownloadCsv = () => {
    if (!customers.length) return;
    
    const csvData = customers.map(c => ({
      Name: c.name,
      Phone: c.phone,
      WhatsApp: c.whatsapp || '',
      Address: c.address,
      'Due Balance': c.dueBalance || 0,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `customer-list.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


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
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                <FileText className="mr-2 h-4 w-4" /> Download PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Download CSV
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <Link href={`/customers/${customer.id}`} className="hover:underline text-primary">
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.address}</TableCell>
                    <TableCell className="text-right">${(customer.dueBalance || 0).toFixed(2)}</TableCell>
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
              )}
            </TableBody>
          </Table>
        </div>
        {hasMore && (
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
