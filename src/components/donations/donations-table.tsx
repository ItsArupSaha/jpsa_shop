import * as React from 'react';
import { format } from 'date-fns';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { Donation } from '@/lib/types';

interface DonationsTableProps {
  donations: Donation[];
  isLoading: boolean;
}

export function DonationsTable({ donations, isLoading }: DonationsTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Donation ID</TableHead>
            <TableHead>Donor</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
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
                  <Skeleton className="h-5 w-3/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-2/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-1/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-1/4 ml-auto" />
                </TableCell>
              </TableRow>
            ))
          ) : donations.length > 0 ? (
            donations.map((donation) => (
              <TableRow key={donation.id}>
                <TableCell>{format(new Date(donation.date), 'PPP')}</TableCell>
                <TableCell className="font-mono">{donation.donationId || 'N/A'}</TableCell>
                <TableCell className="font-medium">{donation.donorName}</TableCell>
                <TableCell>{donation.notes}</TableCell>
                <TableCell>{donation.paymentMethod}</TableCell>
                <TableCell className="text-right">৳{donation.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                No donations recorded yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
