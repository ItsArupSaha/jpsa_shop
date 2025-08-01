'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { getCustomerById, getTransactionsForCustomer } from '@/lib/actions';
import type { Transaction } from '@/lib/types';
import { format } from 'date-fns';
import { Book, DollarSign, MapPin, Phone, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { user } = useAuth();
  const [customerData, setCustomerData] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { id } = await params;
        
        if (!user) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        console.log('Customer Detail Page Debug:', { customerId: id, userId: user.uid });
        
        // Get customer data
        const customer = await getCustomerById(user.uid, id);
        console.log('Customer Data:', customer);

        if (!customer) {
          setError('Customer not found');
          setLoading(false);
          return;
        }

        // Get transactions for this customer (this query doesn't require complex indexes)
        const customerTransactions = await getTransactionsForCustomer(user.uid, id, 'Receivable');
        console.log('Customer Transactions:', customerTransactions);

        setCustomerData(customer);
        setTransactions(customerTransactions);
        setLoading(false);
      } catch (err) {
        console.error('Error loading customer data:', err);
        setError('Failed to load customer data');
        setLoading(false);
      }
    };

    loadData();
  }, [params, user]);

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Book className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Book className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !customerData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Customer Not Found</h1>
          <p className="text-muted-foreground mt-2">The customer you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const customer = { ...customerData, dueBalance: customerData.dueBalance || customerData.openingBalance };

  return (
    <div className="animate-in fade-in-50 space-y-6">
      {/* Customer Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="font-headline text-3xl">{customer.name}</CardTitle>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{customer.phone}</span>
                  {customer.whatsapp && (
                    <>
                      <span>•</span>
                      <span>WhatsApp: {customer.whatsapp}</span>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{customer.address}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className={`font-bold text-3xl ${
                  customer.dueBalance > 0 
                    ? 'text-destructive' 
                    : customer.dueBalance < 0 
                    ? 'text-green-600' 
                    : 'text-primary'
                }`}>
                  ${customer.dueBalance.toFixed(2)}
                </p>
                <div className="flex gap-2">
                  {customer.dueBalance > 0 && (
                    <Badge variant="destructive">Owes Money</Badge>
                  )}
                  {customer.dueBalance < 0 && (
                    <Badge variant="default" className="bg-green-600">Credit Balance</Badge>
                  )}
                  {customer.dueBalance === 0 && (
                    <Badge variant="secondary">Settled</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Transaction History Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-headline text-2xl">Transaction History</CardTitle>
              <CardDescription>
                All transactions between {customer.name} and your bookstore
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <DollarSign className="mr-2 h-4 w-4" />
              Receive Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(new Date(transaction.dueDate), 'PPP')}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{transaction.description}</span>
                          {transaction.paymentMethod && (
                            <Badge variant="outline" className="text-xs">
                              {transaction.paymentMethod}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={transaction.status === 'Paid' ? 'default' : 'secondary'}
                          className={transaction.status === 'Paid' ? 'bg-green-600' : ''}
                        >
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${transaction.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
              <p className="text-muted-foreground">
                No transaction history available for this customer yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
