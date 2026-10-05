'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatTaka } from '@/lib/format';
import type { ClosingStock } from '@/lib/types';

interface ClosingStockResultsProps {
  closingStockData: ClosingStock[];
  closingStockDate: Date | undefined;
  onDownloadPdf: () => void;
  onDownloadXlsx: () => void;
  onClear: () => void;
}

export function ClosingStockResults({
  closingStockData,
  closingStockDate,
  onDownloadPdf,
  onDownloadXlsx,
  onClear
}: ClosingStockResultsProps) {
  if (closingStockData.length === 0) return null;

  const totalStockValue = closingStockData.reduce(
    (sum, item) => sum + (item.closingStock > 0 ? item.closingStock * item.productionPrice : 0),
    0
  );

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">
        Closing Stock as of {closingStockDate ? format(closingStockDate, 'dd MMM yyyy') : ''}
      </h3>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden lg:table-cell">Author</TableHead>
              <TableHead className="text-right">Cost Price</TableHead>
              <TableHead className="text-right">Selling Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Stock Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {closingStockData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell className="hidden md:table-cell">{item.categoryName}</TableCell>
                <TableCell className="hidden lg:table-cell">{item.author || '-'}</TableCell>
                <TableCell className="text-right">{formatTaka(item.productionPrice)}</TableCell>
                <TableCell className="text-right">{formatTaka(item.sellingPrice)}</TableCell>
                <TableCell className="text-right">{item.closingStock}</TableCell>
                <TableCell className="text-right">
                  {formatTaka(item.closingStock > 0 ? item.closingStock * item.productionPrice : 0)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold bg-muted/50">
              <TableCell colSpan={6}>Total stock value (at cost)</TableCell>
              <TableCell className="text-right">{formatTaka(totalStockValue)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={onDownloadPdf}>
          <FileText className="mr-2 h-4 w-4" /> Download PDF
        </Button>
        <Button variant="outline" size="sm" onClick={onDownloadXlsx}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel
        </Button>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onClear}>
          Clear Results
        </Button>
      </div>
      <hr className="my-6" />
    </div>
  );
}
