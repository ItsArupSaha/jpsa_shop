
import CustomerStatementPDF from '@/components/customer-statement-pdf';
import ReceivePaymentDialog from '@/components/receive-payment-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getBooks, getCustomerById, getSalesForCustomer, getTransactionsForCustomer } from '@/lib/actions';
import { getAuthUser } from '@/lib/auth';
import type { AuthUser, Sale, Transaction as PaymentTransaction } from '@/lib/types';
import { format } from 'date-fns';
import { DollarSign } from 'lucide-react';
import { notFound } from 'next/navigation';

type CombinedHistoryItem = 
  | { type: 'Sale'; data: Sale }
  | { type: 'Payment'; data: PaymentTransaction };


export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customerId = params.id;
  
  // Step 1: Securely get the authenticated user.
  // This must be awaited before any other data fetching.
  const user = await getAuthUser();
  if (!user || !user.uid) {
    // This should be caught by middleware, but it's a safeguard.
    return notFound();
  }
  
  // Step 2: Fetch all necessary data in parallel after getting the user.
  const [customer, sales, payments, books] = await Promise.all([
    getCustomerById(user.uid, customerId),
    getSalesForCustomer(user.uid, customerId),
    getTransactionsForCustomer(user.uid, customerId, 'Receivable', { includePaid: true }),
    getBooks(user.uid)
  ]);

  // Step 3: If the customer doesn't exist for this user, show a 404.
  if (!customer) {
    return notFound();
  }

  // Helper to look up book titles from their ID
  const getBookTitle = (bookId: string) => books.find(b => b.id === bookId)?.title || 'Unknown Book';

  // Step 4: Combine sales and payments into a single, sortable history.
  const combinedHistory: CombinedHistoryItem[] = [];
  
  sales.forEach(sale => combinedHistory.push({ type: 'Sale', data: sale }));
  payments
    .filter(p => p.status === 'Paid') // Only show successful payments as credits
    .forEach(payment => combinedHistory.push({ type: 'Payment', data: payment }));

  // Sort the combined history chronologically, newest first.
  combinedHistory.sort((a, b) => {
    const dateA = new Date('date' in a.data ? a.data.date : a.data.dueDate);
    const dateB = new Date('date' in b.data ? b.data.date : b.data.dueDate);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="animate-in fade-in-50">
      <Card>
        <CardHeader className="flex flex-row flex-wrap justify-between items-start gap-4">
          <div>
            <CardTitle className="font-headline text-3xl">{customer.name}</CardTitle>
            <CardDescription>
              {customer.phone} <br />
              {customer.address}
            </CardDescription>
            <div className="mt-4">
                <span className="text-sm text-muted-foreground">Current Balance:</span>
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
             <CustomerStatementPDF customer={customer} sales={sales} books={books} />
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
                  <TableHead className="text-right">Debit (Owed)</TableHead>
                  <TableHead className="text-right">Credit (Paid)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedHistory.length > 0 ? (
                  combinedHistory.map((item, index) => {
                    const key = `${item.type}-${'id' in item.data ? item.data.id : index}`;
                    return (
                      <TableRow key={key}>
                        {/* Date Column */}
                        <TableCell>{format(new Date('date' in item.data ? item.data.date : item.data.dueDate), 'PPP')}</TableCell>
                        
                        {/* Description Column */}
                        <TableCell className="max-w-[400px] truncate">
                           {item.type === 'Sale' ? 
                             `Sale #${(item.data as Sale).saleId}: ${(item.data as Sale).items.map(i => `${i.quantity}x ${getBookTitle(i.bookId)}`).join(', ')}` : 
                             item.data.description}
                           {/* Badge for payment method */}
                           { (item.type === 'Sale' && (item.data as Sale).paymentMethod !== 'Due') &&
                             <Badge variant="outline" className="ml-2">{(item.data as Sale).paymentMethod}</Badge> }
                           { (item.type === 'Payment' && item.data.paymentMethod) && 
                             <Badge variant="secondary" className="ml-2">{item.data.paymentMethod}</Badge> }
                        </TableCell>

                        {/* Debit Column (increases balance) */}
                        <TableCell className="text-right font-medium text-destructive">
                          {item.type === 'Sale' ? `$${(item.data as Sale).total.toFixed(2)}` : ''}
                        </TableCell>

                        {/* Credit Column (decreases balance) */}
                        <TableCell className="text-right font-medium text-primary">
                           {item.type === 'Payment' ? `$${item.data.amount.toFixed(2)}` : ''}
                           {/* For sales paid immediately, they are a credit as well */}
                           {item.type === 'Sale' && (item.data as Sale).paymentMethod === 'Cash' && `$${(item.data as Sale).total.toFixed(2)}`}
                           {item.type === 'Sale' && (item.data as Sale).paymentMethod === 'Bank' && `$${(item.data as Sale).total.toFixed(2)}`}
                           {item.type === 'Sale' && (item.data as Sale).paymentMethod === 'Split' && `$${(item.data as Sale).amountPaid?.toFixed(2) || '0.00'}`}
                        </TableCell>
                      </TableRow>
                    )
                  })
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
