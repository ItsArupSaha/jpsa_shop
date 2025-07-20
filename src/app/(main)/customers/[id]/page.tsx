'use client';

import * as React from 'react';
import { getCustomerById, getSalesForCustomer, getBooks, getTransactionsForCustomer } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import CustomerStatementPDF from '@/components/customer-statement-pdf';
import ReceivePaymentDialog from '@/components/receive-payment-dialog';
import type { Transaction, Sale, Customer, Book } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customerId = params.id;
  
  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [combinedHistory, setCombinedHistory] = React.useState<(Sale | Transaction)[]>([]);
  const [currentBalance, setCurrentBalance] = React.useState(0);
  const [books, setBooks] = React.useState<Book[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [customerSales, setCustomerSales] = React.useState<Sale[]>([]);


  React.useEffect(() => {
    async function loadCustomerData() {
      setIsLoading(true);
      const customerData = await getCustomerById(customerId);
      if (!customerData) {
        // Handle not found case, maybe redirect or show a message
        setIsLoading(false);
        return;
      }
      setCustomer(customerData);

      const [sales, allBooks, customerTransactions] = await Promise.all([
        getSalesForCustomer(customerId),
        getBooks(),
        getTransactionsForCustomer(customerId, 'Receivable'),
      ]);
      setBooks(allBooks);
      setCustomerSales(sales);
      
      const customerReceivables = customerTransactions.filter(t => 
        !t.description.startsWith('Due from Sale')
      );

      const totalDebit = sales
        .filter(s => s.paymentMethod === 'Due' || s.paymentMethod === 'Split')
        .reduce((sum, sale) => {
          if (sale.paymentMethod === 'Due') return sum + sale.total;
          if (sale.paymentMethod === 'Split') return sum + (sale.total - (sale.amountPaid || 0));
          return sum;
        }, customerData.openingBalance);

      const totalCredit = customerTransactions
        .filter(t => t.status === 'Paid' && t.description.includes('Payment from customer'))
        .reduce((sum, t) => sum + t.amount, 0);

      setCurrentBalance(totalDebit - totalCredit);
      
      const history: (Sale | Transaction)[] = [...sales, ...customerReceivables];
      history.sort((a, b) => {
        const dateA = new Date('date' in a ? a.date : a.dueDate);
        const dateB = new Date('date' in b ? b.date : b.dueDate);
        return dateB.getTime() - dateA.getTime();
      });
      setCombinedHistory(history);
      setIsLoading(false);
    }

    loadCustomerData();
  }, [customerId]);

  const getBookTitle = (bookId: string) => books.find(b => b.id === bookId)?.title || 'Unknown Book';

  if (isLoading) {
    return (
        <Card>
            <CardHeader><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-1/3 mt-2" /></CardHeader>
            <CardContent><Skeleton className="h-64 w-full" /></CardContent>
        </Card>
    );
  }

  if (!customer) {
    return <p>Customer not found.</p>;
  }

  return (
    <div className="animate-in fade-in-50">
      <Card>
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle className="font-headline text-3xl">{customer.name}</CardTitle>
            <CardDescription>
              {customer.phone} <br />
              {customer.address}
            </CardDescription>
            <div className="mt-4">
                <span className="text-sm">Current Balance:</span>
                <p className={`font-bold text-2xl ${currentBalance > 0 ? 'text-destructive' : 'text-primary'}`}>
                    ${currentBalance.toFixed(2)}
                </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <ReceivePaymentDialog customerId={customer.id}>
                <Button>
                    <DollarSign className="mr-2 h-4 w-4" /> Receive Payment
                </Button>
            </ReceivePaymentDialog>
             <CustomerStatementPDF customer={customer} sales={customerSales} books={books} />
          </div>
        </CardHeader>
        <CardContent>
          <h2 className="text-xl font-semibold mb-4 font-headline">Transaction History</h2>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedHistory.length > 0 ? (
                  combinedHistory.map((item) => (
                    <TableRow key={'date' in item ? item.id : item.id}>
                      <TableCell>{format(new Date('date' in item ? item.date : item.dueDate), 'PPP')}</TableCell>
                      
                      {'items' in item ? ( // It's a Sale
                        <TableCell className="max-w-[400px] truncate">
                           Sale #{item.id.slice(0,6)}: {item.items.map((i) => `${i.quantity}x ${getBookTitle(i.bookId)}`).join(', ')}
                           <Badge variant="outline" className="ml-2">{item.paymentMethod}</Badge>
                        </TableCell>
                      ) : ( // It's a Transaction
                        <TableCell>
                           {item.description}
                           {item.status === 'Paid' && <Badge variant="secondary" className="ml-2">{item.paymentMethod}</Badge>}
                        </TableCell>
                      )}

                      {'items' in item ? ( // It's a Sale
                        <TableCell className="text-right font-medium text-destructive">
                           { (item.paymentMethod === 'Due' || item.paymentMethod === 'Split') &&
                             `$${(item.total - (item.amountPaid || 0)).toFixed(2)}`
                           }
                        </TableCell>
                      ) : ( // It's a Transaction (These are payments received, so no debit)
                        <TableCell className="text-right font-medium text-destructive"></TableCell>
                      )}
                      
                       {'items' in item ? ( // It's a Sale
                        <TableCell className="text-right font-medium text-primary">
                          { (item.paymentMethod === 'Cash' || item.paymentMethod === 'Bank') && `$${item.total.toFixed(2)}`}
                          { item.paymentMethod === 'Split' && `$${item.amountPaid?.toFixed(2)}`}
                        </TableCell>
                       ) : ( // It's a Transaction
                        <TableCell className="text-right font-medium text-primary">
                           {item.status === 'Paid' && `$${item.amount.toFixed(2)}`}
                        </TableCell>
                       )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No transactions found for this customer.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
