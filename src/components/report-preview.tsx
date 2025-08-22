
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import type { ReportAnalysis } from '@/lib/report-generator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download } from 'lucide-react';

interface ReportPreviewProps {
  reportData: ReportAnalysis;
  month: string;
  year: string;
}

const formatCurrency = (amount: number) => {
    return `BDT ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
};

// Separate function for PDF formatting to avoid BDT symbol issues
const formatCurrencyForPdf = (amount: number) => {
    return `BDT ${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
};

export default function ReportPreview({ reportData, month, year }: ReportPreviewProps) {
  const { authUser } = useAuth();
  const { openingBalances, monthlyActivity, netResult } = reportData;

  const handleDownloadPdf = () => {
    if (!authUser) return;
    const doc = new jsPDF();
    
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
    doc.text(`Monthly Financial Report`, 105, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`${month} ${year}`, 105, 51, { align: 'center' });
    doc.setTextColor(0);
    
    // Balances Table
    autoTable(doc, {
      startY: 60,
      head: [['Opening Balances', 'Amount']],
      body: [
        ['Cash', formatCurrencyForPdf(openingBalances.cash)],
        ['Bank', formatCurrencyForPdf(openingBalances.bank)],
        ['Stock Value', formatCurrencyForPdf(openingBalances.stockValue)],
      ],
      theme: 'striped',
      headStyles: { fillColor: '#306754' },
    });
    
    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // Monthly Activity Table
    autoTable(doc, {
        startY: finalY,
        head: [['Monthly Activity', 'Amount']],
        body: [
            ['Total Sales', formatCurrencyForPdf(monthlyActivity.totalSales)],
            ['Total Profit', formatCurrencyForPdf(monthlyActivity.totalProfit)],
            ['Total Expenses', `(${formatCurrencyForPdf(monthlyActivity.totalExpenses)})`],
            ['Total Donations', formatCurrencyForPdf(monthlyActivity.totalDonations)],
        ],
        theme: 'striped',
        headStyles: { fillColor: '#306754' },
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;

    // Profit Breakdown Section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Profit Breakdown:", 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`• Paid Sales: ${formatCurrencyForPdf(monthlyActivity.profitFromPaidSales)}`, 20, finalY + 8);
    doc.text(`• Partial Payments: ${formatCurrencyForPdf(monthlyActivity.profitFromPartialPayments)}`, 20, finalY + 16);

    finalY += 25;

    // Net Result
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Net Profit / Loss for the Month:", 14, finalY + 15);
    const netColor = netResult.netProfitOrLoss >= 0 ? '#306754' : '#E53E3E';
    doc.setTextColor(netColor);
    doc.text(formatCurrencyForPdf(netResult.netProfitOrLoss), 200, finalY + 15, { align: 'right' });
    doc.setTextColor(0); // Reset color
    
    doc.save(`report-${month}-${year}.pdf`);
  };

  const netColor = netResult.netProfitOrLoss >= 0 ? 'text-primary' : 'text-destructive';

  return (
    <Card className="max-w-4xl mx-auto animate-in fade-in-50">
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle className="font-headline text-2xl">Financial Report</CardTitle>
          <CardDescription>
            Showing results for {month} {year}
          </CardDescription>
        </div>
        <Button onClick={handleDownloadPdf} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tables */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 font-headline">Opening Balances</h3>
              <Table>
                <TableBody>
                  <TableRow><TableCell>Cash</TableCell><TableCell className="text-right">{formatCurrency(openingBalances.cash)}</TableCell></TableRow>
                  <TableRow><TableCell>Bank</TableCell><TableCell className="text-right">{formatCurrency(openingBalances.bank)}</TableCell></TableRow>
                  <TableRow><TableCell>Stock Value</TableCell><TableCell className="text-right">{formatCurrency(openingBalances.stockValue)}</TableCell></TableRow>
                </TableBody>
              </Table>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 font-headline">Monthly Activity</h3>
              <Table>
                <TableBody>
                  <TableRow><TableCell>Total Sales</TableCell><TableCell className="text-right">{formatCurrency(monthlyActivity.totalSales)}</TableCell></TableRow>
                  <TableRow><TableCell>Total Profit</TableCell><TableCell className="text-right">{formatCurrency(monthlyActivity.totalProfit)}</TableCell></TableRow>
                  <TableRow><TableCell>Total Expenses</TableCell><TableCell className="text-right text-destructive">({formatCurrency(monthlyActivity.totalExpenses)})</TableCell></TableRow>
                   <TableRow><TableCell>Total Donations</TableCell><TableCell className="text-right">{formatCurrency(monthlyActivity.totalDonations)}</TableCell></TableRow>
                </TableBody>
              </Table>
              <div className="mt-3 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                <p className="font-medium mb-1">Profit Breakdown:</p>
                <p>• Paid Sales: {formatCurrency(monthlyActivity.profitFromPaidSales)}</p>
                <p>• Partial Payments: {formatCurrency(monthlyActivity.profitFromPartialPayments)}</p>
              </div>
            </div>
          </div>
          {/* Net Result */}
          <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-2 font-headline">Net Result for {month}</h3>
                <div className={`p-4 rounded-lg bg-muted/50 text-center`}>
                    <p className="text-sm text-muted-foreground">Net Profit / Loss</p>
                    <p className={`text-3xl font-bold ${netColor}`}>{formatCurrency(netResult.netProfitOrLoss)}</p>
                </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
