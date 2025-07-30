
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
import { useAuth } from '@/hooks/use-auth';

type BalanceSheetData = Awaited<ReturnType<typeof getBalanceSheetData>>;

interface BalanceSheetProps {
    userId: string;
}

export default function BalanceSheet({ userId }: BalanceSheetProps) {
  const [data, setData] = React.useState<BalanceSheetData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const { authUser } = useAuth();

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const balanceSheetData = await getBalanceSheetData(userId);
      setData(balanceSheetData);
      setIsLoading(false);
    }
    if (userId) {
        loadData();
    }
  }, [userId]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
    });
  };

  const handleDownloadPdf = () => {
    if (!data || !authUser) return;
    const doc = new jsPDF();
    const dateString = format(new Date(), 'PPP');

    // Left side header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(authUser.companyName || 'Bookstore', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(authUser.address || '', 14, 26);
    doc.text(authUser.phone || '', 14, 32);

    // Right side header
    let yPos = 20;
    if (authUser.bkashNumber) {
        doc.text(`Bkash: ${authUser.bkashNumber}`, 200, yPos, { align: 'right' });
        yPos += 6;
    }
    if (authUser.bankInfo) {
        doc.text(`Bank: ${authUser.bankInfo}`, 200, yPos, { align: 'right' });
    }

    // Report Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Sheet', 105, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`As of ${dateString}`, 105, 51, { align: 'center' });
    doc.setTextColor(0);

    // Assets
    autoTable(doc, {
      startY: 60,
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
        <Button onClick={handleDownloadPdf} disabled={isLoading || !data || !authUser} variant="outline">
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
