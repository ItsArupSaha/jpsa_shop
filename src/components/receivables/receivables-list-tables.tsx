import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { CustomerWithDue, Transaction } from '@/lib/types';

interface PendingReceivablesTableProps {
  customers: CustomerWithDue[];
  isLoading: boolean;
}

export function PendingReceivablesTable({ customers, isLoading }: PendingReceivablesTableProps) {
  return (
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
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell>
                  <Skeleton className="h-5 w-3/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-2/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-1/4 ml-auto" />
                </TableCell>
              </TableRow>
            ))
          ) : customers.length > 0 ? (
            customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">
                  <Link href={`/customers/${customer.id}`} className="hover:underline text-primary">
                    {customer.name}
                  </Link>
                </TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell className="text-right font-bold text-destructive">
                  ৳{customer.dueBalance.toFixed(2)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                No pending receivables. Great job!
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

interface ReceivedPaymentsTableProps {
  receivedPayments: Transaction[];
  isLoading: boolean;
}

export function ReceivedPaymentsTable({ receivedPayments, isLoading }: ReceivedPaymentsTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`received-skeleton-${i}`}>
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20 ml-auto" />
                </TableCell>
              </TableRow>
            ))
          ) : receivedPayments.length > 0 ? (
            receivedPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{format(new Date(payment.dueDate), 'PPP')}</TableCell>
                <TableCell className="font-medium">
                  <Link href={`/customers/${payment.customerId}`} className="hover:underline text-primary">
                    {payment.customerName || 'Unknown'}
                  </Link>
                </TableCell>
                <TableCell>{payment.paymentMethod || 'N/A'}</TableCell>
                <TableCell className="text-right font-bold text-primary">
                  ৳{payment.amount.toFixed(2)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                No payments received yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
