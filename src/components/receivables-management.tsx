
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { getCustomersWithDueBalance } from '@/lib/actions';
import { DollarSign, FileSpreadsheet, FileText } from 'lucide-react';
import ReceivePaymentDialog from './receive-payment-dialog';
import Link from 'next/link';

import type { CustomerWithDue } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface ReceivablesManagementProps {
    initialCustomersWithDue: CustomerWithDue[];
}

export default function ReceivablesManagement({ initialCustomersWithDue }: ReceivablesManagementProps) {
  const [customersWithDue, setCustomersWithDue] = React.useState(initialCustomersWithDue);
  const { toast } = useToast();

  React.useEffect(() => {
    // This effect can be used to re-fetch data if needed, for now it just syncs with the prop.
    setCustomersWithDue(initialCustomersWithDue);
  }, [initialCustomersWithDue]);

  const handleDownload = (formatType: 'pdf' | 'csv') => {
    if (customersWithDue.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data',
        description: 'There are no pending receivables to download.',
      });
      return;
    }

    const reportDate = format(new Date(), 'yyyy-MM-dd');
    const body = customersWithDue.map(c => ({
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
                {customersWithDue.length > 0 ? customersWithDue.map((customer) => (
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
        </CardContent>
      </Card>
  );
}
