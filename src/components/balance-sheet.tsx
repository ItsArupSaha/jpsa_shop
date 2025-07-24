'use client';

import * as React from 'react';
import { getBalanceSheetData } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

type BalanceSheetData = Awaited<ReturnType<typeof getBalanceSheetData>>;

export default function BalanceSheet() {
  const [data, setData] = React.useState<BalanceSheetData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const balanceSheetData = await getBalanceSheetData();
      setData(balanceSheetData);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
    });
  };

  const handleDownloadPdf = () => {
    if (!data) return;
    const doc = new jsPDF();
    const dateString = format(new Date(), 'PPP');

    doc.setFontSize(18);
    doc.text('Balance Sheet', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`As of ${dateString}`, 14, 29);

    // Assets
    autoTable(doc, {
      startY: 40,
      head: [['Assets', '']],
      body: [
        ['Cash', formatCurrency(data.cash)],
        ['Bank', formatCurrency(data.bank)],
        ['Accounts Receivable', formatCurrency(data.receivables)],
        ['Stock Value', formatCurrency(data.stockValue)],
        ['Office Assets', formatCurrency(data.officeAssetsValue)],
      ],
      foot: [
        [{ content: 'Total Assets', styles: { fontStyle: 'bold' } }, { content: formatCurrency(data.totalAssets), styles: { fontStyle: 'bold' } }],
      ],
      theme: 'striped',
      headStyles: { fillColor: '#306754', fontStyle: 'bold' },
      footStyles: { fillColor: '#F5F5DC', textColor: '#000000', fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;

    // Liabilities & Equity
    autoTable(doc, {
      startY: finalY + 15,
      head: [['Liabilities & Equity', '']],
      body: [
        ['Accounts Payable', formatCurrency(data.payables)],
        [{ content: 'Total Liabilities', styles: { fontStyle: 'bold' } }, { content: formatCurrency(data.payables), styles: { fontStyle: 'bold' } }],
        ['Owner\'s Equity', formatCurrency(data.equity)],
      ],
      foot: [
         [{ content: 'Total Liabilities + Equity', styles: { fontStyle: 'bold' } }, { content: formatCurrency(data.payables + data.equity), styles: { fontStyle: 'bold' } }],
      ],
      theme: 'striped',
      headStyles: { fillColor: '#306754', fontStyle: 'bold' },
      footStyles: { fillColor: '#F5F5DC', textColor: '#000000', fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } },
    });
    
    doc.save(`Balance-Sheet-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const renderSkeleton = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
            <Skeleton className="h-8 w-2/4" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
        </div>
        <div className="space-y-2">
            <Skeleton className="h-8 w-2/4" />
            <Skeleton className="h-6 w-full" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-8 w-1/4 justify-self-end" />
      </div>
    </div>
  );

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle className="font-headline text-2xl">Balance Sheet</CardTitle>
          <CardDescription>A financial snapshot of your business's assets, liabilities, and equity.</CardDescription>
        </div>
        <Button onClick={handleDownloadPdf} disabled={isLoading || !data} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? renderSkeleton() : data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Assets Section */}
              <div>
                <h3 className="text-lg font-semibold mb-2 font-headline text-primary">Assets</h3>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>Cash</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.cash)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Bank</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.bank)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Accounts Receivable</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.receivables)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Stock Value</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.stockValue)}</TableCell>
                    </TableRow>
                     <TableRow>
                      <TableCell>Office Assets</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.officeAssetsValue)}</TableCell>
                    </TableRow>
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>Total Assets</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.totalAssets)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Liabilities & Equity Section */}
              <div>
                <h3 className="text-lg font-semibold mb-2 font-headline text-destructive">Liabilities & Equity</h3>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>Accounts Payable</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.payables)}</TableCell>
                    </TableRow>
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>Total Liabilities</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.payables)}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={2}>&nbsp;</TableCell>
                    </TableRow>
                    <TableRow className="font-bold bg-primary/10">
                      <TableCell>Owner's Equity</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.equity)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-lg font-bold">
                <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                    <span>Total Assets</span>
                    <span>{formatCurrency(data.totalAssets)}</span>
                </div>
                 <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                    <span>Total Liabilities + Equity</span>
                    <span>{formatCurrency(data.payables + data.equity)}</span>
                </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
