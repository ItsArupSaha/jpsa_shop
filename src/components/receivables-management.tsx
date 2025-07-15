
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { getTransactions, getCustomers } from '@/lib/actions';
import { DollarSign, FileSpreadsheet, FileText } from 'lucide-react';
import ReceivePaymentDialog from './receive-payment-dialog';

import type { Transaction, Customer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

export default function ReceivablesManagement() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const { toast } = useToast();

  const fetchData = React.useCallback(async () => {
    const [receivables, allCustomers] = await Promise.all([
      getTransactions('Receivable'),
      getCustomers(),
    ]);
    const pendingReceivables = receivables.filter(r => r.status === 'Pending');
    setTransactions(pendingReceivables);
    setCustomers(allCustomers);
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getCustomerName = (transaction: Transaction) => {
    if (transaction.customerId) {
        const customer = customers.find(c => c.id === transaction.customerId);
        if (customer) return customer.name;
    }
    // Fallback to check the description if no customerId is found or customer is not in the list
    const match = transaction.description.match(/Sale to (.*)/i);
    if (match && match[1]) {
        return match[1];
    }
    const corporateMatch = transaction.description.match(/Sale #s2 - (.*)/i);
    if (corporateMatch && corporateMatch[1]) {
      return corporateMatch[1];
    }
    return 'N/A';
  };
  
  const getDisplayDescription = (transaction: Transaction) => {
    const customerName = getCustomerName(transaction);
    if(customerName !== 'N/A' && transaction.description.includes(customerName)) {
      return `Sale`;
    }
    return transaction.description;
  }

  const handleDownload = (formatType: 'pdf' | 'csv') => {
    if (transactions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data',
        description: 'There are no pending receivables to download.',
      });
      return;
    }

    const reportDate = format(new Date(), 'yyyy-MM-dd');
    const body = transactions.map(t => ({
        Description: t.description,
        Customer: getCustomerName(t),
        'Due Date': format(new Date(t.dueDate), 'PPP'),
        Amount: `$${t.amount.toFixed(2)}`,
    }));


    if (formatType === 'pdf') {
      const doc = new jsPDF();
      doc.text('Pending Receivables Report', 14, 15);
      doc.text(`As of ${format(new Date(), 'PPP')}`, 14, 22);
      autoTable(doc, {
        startY: 30,
        head: [['Description', 'Customer', 'Due Date', 'Amount']],
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
              <CardDescription>Manage all outstanding amounts owed to the bookstore.</CardDescription>
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
                  <TableHead>Description</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length > 0 ? transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{getDisplayDescription(transaction)}</TableCell>
                    <TableCell>{getCustomerName(transaction)}</TableCell>
                    <TableCell>{format(new Date(transaction.dueDate), 'PPP')}</TableCell>
                    <TableCell className="text-right">${transaction.amount.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        No pending receivables.
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
