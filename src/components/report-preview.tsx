
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
  const { monthlyActivity, salesBreakdown, cashFlow, netResult } = reportData;

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

    // Monthly Activity Table
    const activityBody = [
      ['Total Sales', formatCurrencyForPdf(monthlyActivity.totalSales)],
      ['Total Profit', formatCurrencyForPdf(monthlyActivity.totalProfit)],
      ['Received Payments from Dues', formatCurrencyForPdf(monthlyActivity.receivedPaymentsFromDues)],
      ['Total Donations', formatCurrencyForPdf(monthlyActivity.totalDonations)],
      ['Total Expenses', `(${formatCurrencyForPdf(monthlyActivity.totalExpenses)})`],
    ];

    autoTable(doc, {
      startY: 60,
      head: [['Monthly Activity', 'Amount']],
      body: activityBody,
      theme: 'striped',
      headStyles: { fillColor: '#306754' },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // Sales Breakdown Table
    const salesBreakdownBody = [
      ['Paid Sale', formatCurrencyForPdf(salesBreakdown.paid)],
      ['Due Sale', formatCurrencyForPdf(salesBreakdown.due)],
    ];

    autoTable(doc, {
      startY: finalY,
      head: [['Sales Breakdown', 'Amount']],
      body: salesBreakdownBody,
      theme: 'striped',
      headStyles: { fillColor: '#306754' },
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;

    // Cash Flow Summary Table
    const cashFlowBody = [
      ['Sales - Cash', formatCurrencyForPdf(cashFlow.sales.cash)],
      ['Sales - Bank', formatCurrencyForPdf(cashFlow.sales.bank)],
      ['Due Payments - Cash', formatCurrencyForPdf(cashFlow.duePayments.cash)],
      ['Due Payments - Bank', formatCurrencyForPdf(cashFlow.duePayments.bank)],
      ['Donations - Cash', formatCurrencyForPdf(cashFlow.donations.cash)],
      ['Donations - Bank', formatCurrencyForPdf(cashFlow.donations.bank)],
      ['Expenses - Cash', `(${formatCurrencyForPdf(cashFlow.expenses.cash)})`],
      ['Expenses - Bank', `(${formatCurrencyForPdf(cashFlow.expenses.bank)})`],
    ];

    autoTable(doc, {
      startY: finalY,
      head: [['Cash Flow Summary', 'Amount']],
      body: cashFlowBody,
      theme: 'striped',
      headStyles: { fillColor: '#306754' },
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;

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
              <h3 className="text-lg font-semibold mb-2 font-headline">Monthly Activity</h3>
              <Table>
                <TableBody>
                  <TableRow><TableCell>Total Sales</TableCell><TableCell className="text-right">{formatCurrency(monthlyActivity.totalSales)}</TableCell></TableRow>
                  <TableRow><TableCell>Total Profit</TableCell><TableCell className="text-right">{formatCurrency(monthlyActivity.totalProfit)}</TableCell></TableRow>
                  <TableRow><TableCell>Received Payments from Dues</TableCell><TableCell className="text-right">{formatCurrency(monthlyActivity.receivedPaymentsFromDues)}</TableCell></TableRow>
                  <TableRow><TableCell>Total Donations</TableCell><TableCell className="text-right text-primary">{formatCurrency(monthlyActivity.totalDonations)}</TableCell></TableRow>
                  <TableRow><TableCell>Total Expenses</TableCell><TableCell className="text-right text-destructive">({formatCurrency(monthlyActivity.totalExpenses)})</TableCell></TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
          {/* Net Result & Cash Flow */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 font-headline">Net Result for {month}</h3>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">Net Profit / Loss</p>
                <p className={`text-3xl font-bold ${netColor}`}>{formatCurrency(netResult.netProfitOrLoss)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold font-headline">Cash Flow Overview</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-primary/5">
                  <p className="text-xs text-muted-foreground mb-1">Sales Overview</p>
                  <div className="flex justify-between text-sm">
                    <span>Paid Sale</span>
                    <span className="font-semibold">{formatCurrency(salesBreakdown.paid)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Due Sale</span>
                    <span className="font-semibold">{formatCurrency(salesBreakdown.due)}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-primary/5">
                  <p className="text-xs text-muted-foreground mb-1">Sales</p>
                  <div className="flex justify-between text-sm">
                    <span>Cash</span>
                    <span className="font-semibold">{formatCurrency(cashFlow.sales.cash)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Bank</span>
                    <span className="font-semibold">{formatCurrency(cashFlow.sales.bank)}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-primary/5">
                  <p className="text-xs text-muted-foreground mb-1">Due Payments (Received)</p>
                  <div className="flex justify-between text-sm">
                    <span>Cash</span>
                    <span className="font-semibold">{formatCurrency(cashFlow.duePayments.cash)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Bank</span>
                    <span className="font-semibold">{formatCurrency(cashFlow.duePayments.bank)}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <p className="text-xs text-muted-foreground mb-1">Donations</p>
                  <div className="flex justify-between text-sm">
                    <span>Cash</span>
                    <span className="font-semibold">{formatCurrency(cashFlow.donations.cash)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Bank</span>
                    <span className="font-semibold">{formatCurrency(cashFlow.donations.bank)}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                  <p className="text-xs text-muted-foreground mb-1">Expenses (Outflow)</p>
                  <div className="flex justify-between text-sm">
                    <span>Cash</span>
                    <span className="font-semibold text-destructive">({formatCurrency(cashFlow.expenses.cash)})</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Bank</span>
                    <span className="font-semibold text-destructive">({formatCurrency(cashFlow.expenses.bank)})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
