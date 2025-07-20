
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { DollarSign, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import ReceivePaymentDialog from './receive-payment-dialog';
import Link from 'next/link';

import type { CustomerWithDue } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getCustomersWithDueBalancePaginated, getCustomersWithDueBalance } from '@/lib/actions';

interface ReceivablesManagementProps {
    initialCustomersWithDue: CustomerWithDue[];
    initialHasMore: boolean;
}

export default function ReceivablesManagement({ initialCustomersWithDue, initialHasMore }: ReceivablesManagementProps) {
  const [customers, setCustomers] = React.useState<CustomerWithDue[]>(initialCustomersWithDue);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const { toast } = useToast();
  
  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastCustomer = customers[customers.length - 1];
    
    // We need to pass the last customer's ID and their due balance to get the next page correctly
    const lastVisible = {
        id: lastCustomer.id,
        dueBalance: lastCustomer.dueBalance,
    };

    const { customersWithDue: newCustomers, hasMore: newHasMore } = await getCustomersWithDueBalancePaginated({ pageLimit: 15, lastVisible });
    setCustomers(prev => [...prev, ...newCustomers]);
    setHasMore(newHasMore);
    setIsLoadingMore(false);
  };

  const handleDownload = async (formatType: 'pdf' | 'csv') => {
    // For reports, we fetch all customers with due balance
    const allCustomersWithDue = await getCustomersWithDueBalance();

    if (allCustomersWithDue.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data',
        description: 'There are no pending receivables to download.',
      });
      return;
    }

    const reportDate = format(new Date(), 'yyyy-MM-dd');
    const body = allCustomersWithDue.map(c => ({
        Customer: c.name,
        Phone: c.phone,
        'Due Amount': `$${c.dueBalance.toFixed(2)}`,
    }));

    if (formatType === 'pdf') {
      const doc = new jsPDF();
      doc.text('Pending Receivables Report', 14, 15);
      doc.text(`As of ${format(new Date(), 'PPP')}`, 14, 22);
      autoTable(doc, {
        startY: 30,
        head: [['Customer', 'Phone', 'Due Amount']],
        body: body.map(row => Object.values(row)),
      });
      doc.save(`pending-receivables-${reportDate}.pdf`);
    } else {
      const csv = Papa.unparse(body);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `pending-receivables-${reportDate}.csv`);
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
              <CardTitle className="font-headline text-2xl">Pending Receivables</CardTitle>
              <CardDescription>A list of all customers with an outstanding balance.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 items-end">
                <ReceivePaymentDialog>
                    <Button>
                        <DollarSign className="mr-2 h-4 w-4" /> Receive Payment
                    </Button>
                </ReceivePaymentDialog>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownload('pdf')}>
                        <FileText className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload('csv')}>
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Total Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length > 0 ? customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                        <Link href={`/customers/${customer.id}`} className="hover:underline text-primary">
                            {customer.name}
                        </Link>
                    </TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">${customer.dueBalance.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                        No pending receivables. Great job!
                    </TableCell>
                  </TableRow>
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
      </Card>
  );
}
