'use client';

import CustomerStatementPDF from '@/components/customer-statement-pdf';
import ReceivePaymentDialog from '@/components/receive-payment-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { getCustomerById, getTransactionsForCustomer, getSalesForCustomer, getItems } from '@/lib/actions';
import { formatTaka } from '@/lib/format';
import type { Item, Sale, Transaction } from '@/lib/types';
import { format } from 'date-fns';
import { ArrowLeft, Book, MapPin, Phone, User, ShoppingCart, ArrowDownToLine } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

type Activity = ((Transaction & { activityType: 'transaction'; sortDate: number }) | (Sale & { activityType: 'sale'; sortDate: number }));

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { user } = useAuth();
  const [customerData, setCustomerData] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { id } = await params;

        if (!user) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        const customer = await getCustomerById(user.uid, id);

        if (!customer) {
          setError('Customer not found');
          setLoading(false);
          return;
        }

        const customerTransactions = await getTransactionsForCustomer(user.uid, id, 'Receivable');
        const sales = await getSalesForCustomer(user.uid, id);
        const allItems = await getItems(user.uid);

        const combinedActivities: Activity[] = [
          ...customerTransactions
            .filter(t => !t.description?.startsWith('Due from SALE'))
            .map((t): Activity => ({ ...t, activityType: 'transaction', sortDate: new Date(t.dueDate).getTime() })),
          ...sales.map((s): Activity => ({ ...s, activityType: 'sale', sortDate: new Date(s.date).getTime() }))
        ].sort((a, b) => b.sortDate - a.sortDate);

        setCustomerData(customer);
        setActivities(combinedActivities);
        setCustomerSales(sales);
        setItems(allItems);
        setError(null);
      } catch (err) {
        console.error('Error loading customer data:', err);
        setError('Failed to load customer data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params, user, reloadKey]);

  if (!user || loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Book className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !customerData) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Customer Not Found</h1>
          <p className="text-muted-foreground mt-2">The customer you're looking for doesn't exist.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/customers"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers</Link>
          </Button>
        </div>
      </div>
    );
  }

  const customer = { ...customerData, dueBalance: customerData.dueBalance ?? customerData.openingBalance };

  return (
    <div className="animate-in fade-in-50 space-y-6">
      {/* Customer Information Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon" aria-label="Back to customers" className="-ml-2">
                  <Link href="/customers"><ArrowLeft className="h-5 w-5" /></Link>
                </Button>
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
                  {formatTaka(customer.dueBalance)}
                </p>
                <div className="flex gap-2 justify-end">
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-headline text-2xl">Transaction History</CardTitle>
              <CardDescription>
                All transactions between {customer.name} and your store
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {user && (
                <ReceivePaymentDialog
                  customerId={customer.id}
                  userId={user.uid}
                  onPaymentReceived={() => setReloadKey((k) => k + 1)}
                >
                  <Button size="sm">
                    <ArrowDownToLine className="mr-2 h-4 w-4" />
                    Receive Payment
                  </Button>
                </ReceivePaymentDialog>
              )}
              <CustomerStatementPDF customer={customer} sales={customerSales} items={items} />
            </div>
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
                          {format(new Date(isSale ? activity.date : activity.dueDate), 'dd MMM yyyy')}
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
                          {formatTaka(isSale ? activity.total : activity.amount)}
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
