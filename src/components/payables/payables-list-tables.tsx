import * as React from 'react';
import { format } from 'date-fns';
import { DollarSign } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { CustomerWithDue, Transaction } from '@/lib/types';
import PayPayableDialog from '../pay-payable-dialog';
import RefundCustomerDialog from '../refund-customer-dialog';

interface PendingPayablesTableProps {
  payables: Transaction[];
  isLoading: boolean;
  userId: string;
  onPaymentSuccess: () => void;
}

export function PendingPayablesTable({
  payables,
  isLoading,
  userId,
  onPaymentSuccess,
}: PendingPayablesTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-32 text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-payable-${i}`}>
                <TableCell>
                  <Skeleton className="h-5 w-3/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-2/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-1/4 ml-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : payables.length > 0 ? (
            payables.map((payable) => (
              <TableRow key={payable.id}>
                <TableCell className="font-medium">{payable.description}</TableCell>
                <TableCell>{format(new Date(payable.dueDate), 'PPP')}</TableCell>
                <TableCell className="text-right">৳{payable.amount.toFixed(2)}</TableCell>
                <TableCell className="text-center">
                  <PayPayableDialog payable={payable} userId={userId} onPaymentSuccess={onPaymentSuccess}>
                    <Button size="sm" variant="outline" className="w-full whitespace-nowrap">
                      <DollarSign className="w-3 h-3 mr-1" /> Pay
                    </Button>
                  </PayPayableDialog>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                No pending payables right now.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

interface CustomerOverpaymentsTableProps {
  overpaidCustomers: CustomerWithDue[];
  isLoading: boolean;
  userId: string;
  onRefundSuccess: () => void;
}

export function CustomerOverpaymentsTable({
  overpaidCustomers,
  isLoading,
  userId,
  onRefundSuccess,
}: CustomerOverpaymentsTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="text-right">Overpaid</TableHead>
            <TableHead className="w-32 text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={`skeleton-cust-${i}`}>
                <TableCell>
                  <Skeleton className="h-5 w-3/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-2/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-1/4 ml-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : overpaidCustomers.length > 0 ? (
            overpaidCustomers.map((cust) => (
              <TableRow key={cust.id}>
                <TableCell className="font-medium">{cust.name}</TableCell>
                <TableCell>{cust.phone}</TableCell>
                <TableCell className="text-right font-bold text-emerald-600">
                  ৳{Math.abs(cust.dueBalance).toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  <RefundCustomerDialog customer={cust} userId={userId} onRefundSuccess={onRefundSuccess}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 whitespace-nowrap"
                    >
                      <DollarSign className="w-3 h-3 mr-1" /> Refund
                    </Button>
                  </RefundCustomerDialog>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                No customer overpayments recorded.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

interface PaidHistoryTableProps {
  paidPayables: Transaction[];
  isLoading: boolean;
}

export function PaidHistoryTable({ paidPayables, isLoading }: PaidHistoryTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Date Paid</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={`paid-skeleton-${i}`}>
                <TableCell>
                  <Skeleton className="h-5 w-3/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-2/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-2/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-1/4 ml-auto" />
                </TableCell>
              </TableRow>
            ))
          ) : paidPayables.length > 0 ? (
            paidPayables.map((payable) => (
              <TableRow key={payable.id}>
                <TableCell className="font-medium">{payable.description}</TableCell>
                <TableCell>{format(new Date(payable.dueDate), 'PPP')}</TableCell>
                <TableCell>{payable.paymentMethod || 'Cash'}</TableCell>
                <TableCell className="text-right text-primary font-bold">
                  ৳{payable.amount.toFixed(2)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                No paid payables yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
