import * as React from 'react';
import { getCustomerById, getSales, getBooks } from '@/lib/actions';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import CustomerStatementPDF from '@/components/customer-statement-pdf';

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customerId = params.id;
  const [customer, sales, books] = await Promise.all([
    getCustomerById(customerId),
    getSales(),
    getBooks(),
  ]);

  if (!customer) {
    notFound();
  }
  
  const customerSales = sales.filter(sale => sale.customerId === customerId);

  const getBookTitle = (bookId: string) => books.find(b => b.id === bookId)?.title || 'Unknown Book';

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
          </div>
          <CustomerStatementPDF customer={customer} sales={customerSales} books={books} />
        </CardHeader>
        <CardContent>
          <h2 className="text-xl font-semibold mb-4 font-headline">Transaction History</h2>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerSales.length > 0 ? (
                  customerSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{format(new Date(sale.date), 'PPP')}</TableCell>
                      <TableCell className="max-w-[400px] truncate">
                        {sale.items.map((i) => `${i.quantity}x ${getBookTitle(i.bookId)}`).join(', ')}
                      </TableCell>
                      <TableCell>{sale.paymentMethod}</TableCell>
                      <TableCell className="text-right font-medium">${sale.total.toFixed(2)}</TableCell>
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
