'use client';

import { format } from 'date-fns';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { getAccountOverview } from '@/lib/actions';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CalendarIcon, Download } from 'lucide-react';

interface BalanceSheetProps {
    userId: string;
}

type Overview = Awaited<ReturnType<typeof getAccountOverview>>;

const formatCurrency = (amount: number) =>
    `BDT ${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const formatCurrencyForPdf = (amount: number) =>
    `BDT ${new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount)}`;


export default function BalanceSheet({ userId }: BalanceSheetProps) {
    const { authUser } = useAuth();
    const [asOfDate, setAsOfDate] = React.useState<Date | undefined>(undefined);
    const [current, setCurrent] = React.useState<Overview | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (!userId) return;

        async function loadData() {
            setIsLoading(true);

            let targetDate = asOfDate ?? new Date();

            // If a specific date is selected, set it to the end of that day to include all transactions
            if (asOfDate) {
                targetDate = new Date(asOfDate);
                targetDate.setHours(23, 59, 59, 999);
            }

            const currentSnapshot = await getAccountOverview(userId, targetDate);

            setCurrent(currentSnapshot);
            setIsLoading(false);
        }

        loadData();
    }, [userId, asOfDate]);

    const renderSkeleton = () => (
        <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-px w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        </div>
    );

    const effectiveDate = asOfDate ?? new Date();
    const monthLabel = format(effectiveDate, 'MMMM yyyy');

    const handleDownloadPdf = () => {
        if (!authUser || !current) return;
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
        doc.text('Balance Sheet', 105, 45, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`As of: ${format(effectiveDate, 'PPP')}`, 105, 51, { align: 'center' });
        doc.setTextColor(0);

        // Assets & Dues Table
        const assetsBody = [
            ['Cash', formatCurrencyForPdf(current.cash)],
            ['Bank', formatCurrencyForPdf(current.bank)],
            ['Customer Dues (Receivables)', formatCurrencyForPdf(current.receivables)],
            ['Stock Value', formatCurrencyForPdf(current.stockValue)],
            ['Office Assets', formatCurrencyForPdf(current.officeAssetsValue)],
        ];

        autoTable(doc, {
            startY: 60,
            head: [['Assets & Dues', 'Amount']],
            body: assetsBody,
            foot: [
                [{ content: 'Total Assets', styles: { fontStyle: 'bold' } }, { content: formatCurrencyForPdf(current.totalAssets), styles: { fontStyle: 'bold' } }],
            ],
            theme: 'striped',
            headStyles: { fillColor: '#306754', fontStyle: 'bold' },
            footStyles: { fillColor: '#F5F5DC', textColor: '#000000', fontStyle: 'bold' },
            columnStyles: { 1: { halign: 'right' } },
        });

        const finalY = (doc as any).lastAutoTable.finalY || 100;

        // Liabilities & Equity Table
        const liabilitiesBody = [
            ['Payables', formatCurrencyForPdf(current.payables)],
            [{ content: 'Total Liabilities', styles: { fontStyle: 'bold' as const } }, { content: formatCurrencyForPdf(current.payables), styles: { fontStyle: 'bold' as const } }],
            ['', ''],
            [{ content: 'Owner\'s Equity / Net Worth', styles: { fontStyle: 'bold' as const } }, { content: formatCurrencyForPdf(current.equity), styles: { fontStyle: 'bold' as const } }],
        ] as any;

        autoTable(doc, {
            startY: finalY + 15,
            head: [['Liabilities & Equity', 'Amount']],
            body: liabilitiesBody,
            theme: 'striped',
            headStyles: { fillColor: '#306754', fontStyle: 'bold' as const },
            columnStyles: { 1: { halign: 'right' } },
        });

        const fileName = asOfDate
            ? `balance-sheet-${format(effectiveDate, 'yyyy-MM-dd')}.pdf`
            : `balance-sheet-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        doc.save(fileName);
    };

    return (
        <Card className="max-w-5xl mx-auto animate-in fade-in-50">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <CardTitle className="font-headline text-2xl">Balance Sheet</CardTitle>
                    <CardDescription>
                        Snapshot of your cash, bank, dues, payables and stock as of a specific date.
                        <span className="block mt-1 text-xs">
                            Opening balances are taken as the closing balances of the previous month.
                        </span>
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {asOfDate ? format(asOfDate, 'PPP') : 'As of Today'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={asOfDate}
                                onSelect={setAsOfDate}
                                initialFocus
                            />
                            {asOfDate && (
                                <div className="p-3 border-t">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => setAsOfDate(undefined)}
                                    >
                                        View Today
                                    </Button>
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>
                    <Button
                        onClick={handleDownloadPdf}
                        variant="outline"
                        disabled={isLoading || !current}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading || !current ? (
                    renderSkeleton()
                ) : (
                    <div className="space-y-6">
                        <div className="text-sm text-muted-foreground">
                            Showing balances for{' '}
                            <span className="font-medium">
                                {format(effectiveDate, 'PPP')}
                            </span>{' '}
                            (month: {monthLabel})
                        </div>

                        {/* Current balances for key accounts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2 font-headline text-primary">
                                    Assets & Dues
                                </h3>
                                <Table>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>Cash</TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(current.cash)}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Bank</TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(current.bank)}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Customer Dues (Receivables)</TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(current.receivables)}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Stock Value</TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(current.stockValue)}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Office Assets</TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(current.officeAssetsValue)}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="font-semibold bg-muted/50">
                                            <TableCell>Total Assets</TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(current.totalAssets)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-2 font-headline text-destructive">
                                    Liabilities & Equity
                                </h3>
                                <Table>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>Payables</TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(current.payables)}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="font-semibold bg-muted/50">
                                            <TableCell>Total Liabilities</TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(current.payables)}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={2}>&nbsp;</TableCell>
                                        </TableRow>
                                        <TableRow className="font-semibold bg-primary/10">
                                            <TableCell>Owner&apos;s Equity / Net Worth</TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(current.equity)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

