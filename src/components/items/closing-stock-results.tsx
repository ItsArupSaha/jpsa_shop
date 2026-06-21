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

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">
        Closing Stock as of {closingStockDate ? format(closingStockDate, 'PPP') : ''}
      </h3>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Author/Group</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead className="text-right">Prod. Price</TableHead>
              <TableHead className="text-right">MRP</TableHead>
              <TableHead className="text-right">Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {closingStockData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.categoryName}</TableCell>
                <TableCell>{item.author || item.medicineGroup || '-'}</TableCell>
                <TableCell>{item.company || '-'}</TableCell>
                <TableCell>
                  {item.expiryDate ? format(new Date(item.expiryDate), 'yyyy-MM-dd') : '-'}
                </TableCell>
                <TableCell className="text-right">৳{item.productionPrice.toFixed(2)}</TableCell>
                <TableCell className="text-right">৳{item.sellingPrice.toFixed(2)}</TableCell>
                <TableCell className="text-right">{item.closingStock}</TableCell>
              </TableRow>
            ))}
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
