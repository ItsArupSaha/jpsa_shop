'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { getCustomerById, getTransactionsForCustomer, getSalesForCustomer, getItems } from '@/lib/actions';
import type { Transaction, Sale, Item } from '@/lib/types';
import { format } from 'date-fns';
import { Book, DollarSign, MapPin, Phone, User, ShoppingCart, ArrowDownToLine } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { user } = useAuth();
  const [customerData, setCustomerData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([]);
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
        // Ensure we catch all payment records and older sales
        const customerTransactions = await getTransactionsForCustomer(user.uid, id, 'Receivable');
        const customerSales = await getSalesForCustomer(user.uid, id);

        // Fetch items so we can display the titles for the sale rows
        const allItems = await getItems(user.uid);

        // Combine them into a single timeline Activity array
        const combinedActivities = [
          ...customerTransactions
            .filter(t => !t.description?.startsWith('Due from SALE'))
            .map(t => ({ ...t, activityType: 'transaction', sortDate: new Date(t.dueDate).getTime() })),
          ...customerSales.map(s => ({ ...s, activityType: 'sale', sortDate: new Date(s.date).getTime() }))
        ].sort((a, b) => b.sortDate - a.sortDate);

        setCustomerData(customer);
        setActivities(combinedActivities);
        setItems(allItems);
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
                <p className={`font-bold text-3xl ${customer.dueBalance > 0
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
          {activities.length > 0 ? (
            <div className="border rounded-md max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Status / Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity, index) => {
                    const isSale = activity.activityType === 'sale';

                    return (
                      <TableRow key={activity.id || index}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(isSale ? activity.date : activity.dueDate), 'PPP')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 font-medium">
                            {isSale ? (
                              <><ShoppingCart className="h-4 w-4 text-primary" /> Sale</>
                            ) : (
                              <><ArrowDownToLine className="h-4 w-4 text-green-600" /> Payment/Due</>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          {isSale ? (
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground font-mono">{activity.saleId}</span>
                              <div className="text-sm">
                                {activity.items.map((i: any) => {
                                  const itemTitle = items.find(it => it.id === i.itemId)?.title || 'Unknown Item';
                                  return (
                                    <div key={i.itemId} className="truncate">
                                      {i.quantity}x {itemTitle}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="truncate block">{activity.description}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isSale ? (
                            <Badge variant="outline">{activity.paymentMethod}</Badge>
                          ) : (
                            <Badge
                              variant={activity.status === 'Paid' ? 'default' : activity.status === 'Pending' ? 'destructive' : 'secondary'}
                              className={activity.status === 'Paid' ? 'bg-green-600' : ''}
                            >
                              {activity.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          TK {isSale ? activity.total.toFixed(2) : activity.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
