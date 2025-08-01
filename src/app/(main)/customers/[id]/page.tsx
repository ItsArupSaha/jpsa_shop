
import CustomerStatementPDF from '@/components/customer-statement-pdf';
import ReceivePaymentDialog from '@/components/receive-payment-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getBooks, getCustomerById, getSalesForCustomer, getTransactionsForCustomer } from '@/lib/actions';
import { getAuthUser } from '@/lib/auth';
import type { Sale, Transaction } from '@/lib/types';
import { format } from 'date-fns';
import { DollarSign } from 'lucide-react';
import { notFound } from 'next/navigation';


export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customerId = params.id;
  const user = await getAuthUser();
  if (!user) {
    // This should be handled by middleware in a real app, but for now, we'll return a 404.
    return notFound();
  }
  
  const customerData = await getCustomerById(user.uid, customerId);

  if (!customerData) {
    return notFound();
  }
  // Use the dueBalance from the customer document as the single source of truth.
  const customer = { ...customerData, dueBalance: customerData.dueBalance };


  const [customerSales, books, customerPayments] = await Promise.all([
    getSalesForCustomer(user.uid, customerId),
    getBooks(user.uid),
    // Fetch all 'Paid' receivable transactions which represent payments from this customer.
    getTransactionsForCustomer(user.uid, customerId, 'Receivable', { includePaid: true }),
  ]);
  
  const getBookTitle = (bookId: string) => books.find(b => b.id === bookId)?.title || 'Unknown Book';

  // Combine sales and payments into a single history list
  const combinedHistory: (Sale | Transaction)[] = [...customerSales, ...customerPayments.filter(p => p.status === 'Paid')];
  combinedHistory.sort((a, b) => {
    // Get the date from either a Sale or a Transaction object
    const dateA = new Date('date' in a ? a.date : a.dueDate);
    const dateB = new Date('date' in b ? b.date : b.dueDate);
    return dateB.getTime() - dateA.getTime();
  });

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
                <p className={`font-bold text-2xl ${customer.dueBalance > 0 ? 'text-destructive' : 'text-primary'}`}>
                    ${customer.dueBalance.toFixed(2)}
                </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <ReceivePaymentDialog customerId={customer.id} userId={user.uid}>
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
                    <TableRow key={'saleId' in item ? item.id : item.id}>
                      <TableCell>{format(new Date('date' in item ? item.date : item.dueDate), 'PPP')}</TableCell>
                      
                      {'items' in item ? ( // It's a Sale
                        <TableCell className="max-w-[400px] truncate">
                           Sale #{item.saleId}: {item.items.map((i) => `${i.quantity}x ${getBookTitle(i.bookId)}`).join(', ')}
                           <Badge variant="outline" className="ml-2">{item.paymentMethod}</Badge>
                        </TableCell>
                      ) : ( // It's a Transaction (Payment)
                        <TableCell>
                           {item.description}
                           {item.status === 'Paid' && <Badge variant="secondary" className="ml-2">{item.paymentMethod}</Badge>}
                        </TableCell>
                      )}

                      {'items' in item ? ( // It's a Sale (Debit)
                        <TableCell className="text-right font-medium text-destructive">
                           {`$${item.total.toFixed(2)}`}
                        </TableCell>
                      ) : ( // It's a Transaction (No Debit for payments)
                        <TableCell className="text-right"></TableCell>
                      )}
                      
                       {'items' in item ? ( // A sale is only a credit if it was paid immediately
                        <TableCell className="text-right font-medium text-primary">
                          { (item.paymentMethod === 'Cash' || item.paymentMethod === 'Bank') && `$${item.total.toFixed(2)}`}
                          { item.paymentMethod === 'Split' && `$${item.amountPaid?.toFixed(2)}`}
                        </TableCell>
                       ) : ( // It's a Transaction (Credit)
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
