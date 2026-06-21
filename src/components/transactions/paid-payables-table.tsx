import * as React from 'react';
import { format } from 'date-fns';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { Transaction } from '@/lib/types';

interface PaidPayablesTableProps {
  paidPayables: Transaction[];
  isLoading: boolean;
}

export function PaidPayablesTable({ paidPayables, isLoading }: PaidPayablesTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Due Date</TableHead>
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
                  <Skeleton className="h-5 w-1/4 ml-auto" />
                </TableCell>
              </TableRow>
            ))
          ) : paidPayables.length > 0 ? (
            paidPayables.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">{transaction.description}</TableCell>
                <TableCell>{format(new Date(transaction.dueDate), 'PPP')}</TableCell>
                <TableCell className="text-right text-primary font-bold">
                  ৳{transaction.amount.toFixed(2)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                No paid payables yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
