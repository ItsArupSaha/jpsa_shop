import * as React from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

const formatCurrency = (amount: number) =>
  `BDT ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

interface OverviewProps {
  cash: number;
  bank: number;
  receivables: number;
  stockValue: number;
  officeAssetsValue: number;
  totalAssets: number;
  payables: number;
  equity: number;
}

export function OverviewTables({
  overview,
  highlightEquity,
}: {
  overview: OverviewProps;
  highlightEquity?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-2 font-headline text-lg font-semibold text-primary">Assets &amp; dues</h3>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cash</TableCell>
              <TableCell className="text-right">{formatCurrency(overview.cash)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Bank</TableCell>
              <TableCell className="text-right">{formatCurrency(overview.bank)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Customer dues (receivables)</TableCell>
              <TableCell className="text-right">{formatCurrency(overview.receivables)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Stock value</TableCell>
              <TableCell className="text-right">{formatCurrency(overview.stockValue)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Office assets</TableCell>
              <TableCell className="text-right">{formatCurrency(overview.officeAssetsValue)}</TableCell>
            </TableRow>
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell>Total assets</TableCell>
              <TableCell className="text-right">{formatCurrency(overview.totalAssets)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div>
        <h3 className="mb-2 font-headline text-lg font-semibold text-destructive">Liabilities &amp; equity</h3>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Payables</TableCell>
              <TableCell className="text-right">{formatCurrency(overview.payables)}</TableCell>
            </TableRow>
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell>Total liabilities</TableCell>
              <TableCell className="text-right">{formatCurrency(overview.payables)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={2}>&nbsp;</TableCell>
            </TableRow>
            <TableRow className={highlightEquity ? 'bg-primary/10 font-semibold' : 'font-semibold'}>
              <TableCell>Owner&apos;s equity / net worth</TableCell>
              <TableCell className="text-right">{formatCurrency(overview.equity)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
