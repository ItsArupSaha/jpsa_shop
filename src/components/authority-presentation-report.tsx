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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import {
    getAuthorityPresentationReport,
    type AuthorityPresentationReport as AuthorityReportData,
} from '@/lib/db/authority-presentation-report';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CalendarIcon, Download } from 'lucide-react';

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

function truncatePdfCell(text: string, maxLen: number): string {
    const t = (text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= maxLen) return t;
    return `${t.slice(0, maxLen - 1)}…`;
}

type OverviewPdf = AuthorityReportData['opening'];

function drawCompanyHeader(
    doc: jsPDF,
    authUser: {
        companyName?: string;
        address?: string;
        phone?: string;
        bkashNumber?: string;
        bankInfo?: string;
    }
) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(authUser.companyName || 'Bookstore', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(authUser.address || '', 14, 26);
    doc.text(authUser.phone || '', 14, 32);

    let yPos = 20;
    if (authUser.bkashNumber) {
        doc.text(`Bkash: ${authUser.bkashNumber}`, 200, yPos, { align: 'right' });
        yPos += 6;
    }
    if (authUser.bankInfo) {
        doc.text(`Bank: ${authUser.bankInfo}`, 200, yPos, { align: 'right' });
    }
}

function appendBalanceSheetSection(
    doc: jsPDF,
    title: string,
    asOfLabel: string,
    overview: OverviewPdf,
    startY: number
): number {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(48, 103, 84);
    doc.text(title, 14, startY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(asOfLabel, 14, startY + 5);
    doc.setTextColor(0);

    const assetsBody: (string | { content: string; styles?: { fontStyle: string } })[][] = [
        ['Cash', formatCurrencyForPdf(overview.cash)],
        ['Bank', formatCurrencyForPdf(overview.bank)],
        ['Customer Dues (Receivables)', formatCurrencyForPdf(overview.receivables)],
        ['Stock Value', formatCurrencyForPdf(overview.stockValue)],
        ['Office Assets', formatCurrencyForPdf(overview.officeAssetsValue)],
    ];

    autoTable(doc, {
        startY: startY + 10,
        head: [['Assets & Dues', 'Amount']],
        body: assetsBody as string[][],
        foot: [
            [
                { content: 'Total Assets', styles: { fontStyle: 'bold' } },
                { content: formatCurrencyForPdf(overview.totalAssets), styles: { fontStyle: 'bold' } },
            ],
        ],
        theme: 'striped',
        headStyles: { fillColor: '#306754', fontStyle: 'bold' },
        footStyles: { fillColor: '#F5F5DC', textColor: '#000000', fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } },
    });

    let y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 80) + 12;

    if (y > 230) {
        doc.addPage();
        y = 24;
    }

    const liabilitiesBody = [
        ['Payables', formatCurrencyForPdf(overview.payables)],
        [
            { content: 'Total Liabilities', styles: { fontStyle: 'bold' as const } },
            { content: formatCurrencyForPdf(overview.payables), styles: { fontStyle: 'bold' as const } },
        ],
        ['', ''],
        [
            { content: "Owner's Equity / Net Worth", styles: { fontStyle: 'bold' as const } },
            { content: formatCurrencyForPdf(overview.equity), styles: { fontStyle: 'bold' as const } },
        ],
    ] as any;

    autoTable(doc, {
        startY: y,
        head: [['Liabilities & Equity', 'Amount']],
        body: liabilitiesBody,
        theme: 'striped',
        headStyles: { fillColor: '#306754', fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } },
    });

    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function nextSectionStart(doc: jsPDF, lastFinalY: number, gap = 16): number {
    const next = lastFinalY + gap;
    if (next > 248) {
        doc.addPage();
        return 22;
    }
    return next;
}

interface AuthorityPresentationReportProps {
    userId: string;
}

export default function AuthorityPresentationReport({ userId }: AuthorityPresentationReportProps) {
    const { authUser } = useAuth();
    const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [report, setReport] = React.useState<AuthorityReportData | null>(null);

    const runReport = async () => {
        if (!startDate || !endDate) {
            setError('Choose both a start date and an end date.');
            return;
        }
        setError(null);
        setLoading(true);
        setReport(null);
        const startYmd = format(startDate, 'yyyy-MM-dd');
        const endYmd = format(endDate, 'yyyy-MM-dd');
        const res = await getAuthorityPresentationReport(userId, startYmd, endYmd);
        setLoading(false);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        setReport(res.data);
    };

    const handleDownloadPdf = () => {
        if (!authUser || !report || !startDate || !endDate) return;

        const doc = new jsPDF();
        drawCompanyHeader(doc, authUser);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Authority Presentation Report', 105, 48, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Period: ${format(startDate, 'PP')} – ${format(endDate, 'PP')}`, 105, 55, {
            align: 'center',
        });
        doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 105, 61, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        let y = appendBalanceSheetSection(
            doc,
            '1. Opening balance sheet',
            `As of ${format(startDate, 'PPP')} (end of day)`,
            report.opening,
            68
        );

        y = nextSectionStart(doc, y, 18);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(48, 103, 84);
        doc.text('2. Income and expense by period', 14, y);
        doc.setTextColor(0, 0, 0);

        const periodBody = report.periods.map((row) => [
            `${row.label}\n(${row.fromYmd} → ${row.toYmd})`,
            formatCurrencyForPdf(row.income),
            formatCurrencyForPdf(row.expense),
            formatCurrencyForPdf(row.net),
        ]);

        autoTable(doc, {
            startY: y + 6,
            head: [['Period', 'Income (sales)', 'Expense', 'Net']],
            body: periodBody,
            theme: 'striped',
            headStyles: { fillColor: '#306754', fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 72 },
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right' },
            },
            styles: { fontSize: 8, cellPadding: 2 },
        });

        let lastTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
        y = nextSectionStart(doc, lastTableY, 18);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(48, 103, 84);
        doc.text('3. Purchases (books and items)', 14, y);
        doc.setTextColor(0, 0, 0);

        if (report.purchases.length === 0) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text('No purchases in this date range.', 14, y + 7);
            lastTableY = y + 14;
        } else {
            const purchaseBody = report.purchases.map((p) => [
                p.purchaseId,
                format(new Date(p.date), 'yyyy-MM-dd'),
                truncatePdfCell(p.supplier, 22),
                truncatePdfCell(p.itemSummary, 48),
                formatCurrencyForPdf(p.totalAmount),
            ]);
            autoTable(doc, {
                startY: y + 6,
                head: [['ID', 'Date', 'Supplier', 'Items (summary)', 'Total']],
                body: purchaseBody,
                theme: 'striped',
                headStyles: { fillColor: '#306754', fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 24, font: 'courier', fontStyle: 'normal' },
                    1: { cellWidth: 24 },
                    2: { cellWidth: 28 },
                    3: { cellWidth: 62 },
                    4: { halign: 'right', cellWidth: 32 },
                },
                styles: { fontSize: 7, cellPadding: 1.5 },
            });
            lastTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
        }

        y = nextSectionStart(doc, lastTableY, 18);
        y = appendBalanceSheetSection(
            doc,
            '4. Closing balance sheet',
            `As of ${format(endDate, 'PPP')} (end of day)`,
            report.closing,
            y
        );

        y = nextSectionStart(doc, y, 18);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(48, 103, 84);
        doc.text("5. Change in Owner's Equity / Net Worth", 14, y);
        doc.setTextColor(0, 0, 0);

        const equityBody = [
            ['Equity at start of period', formatCurrencyForPdf(report.equityStart)],
            ['Equity at end of period', formatCurrencyForPdf(report.equityEnd)],
            [
                {
                    content: 'Net change (profit if positive, loss if negative)',
                    styles: { fontStyle: 'bold' as const },
                },
                {
                    content: formatCurrencyForPdf(report.equityDelta),
                    styles: { fontStyle: 'bold' as const },
                },
            ],
        ] as any;

        autoTable(doc, {
            startY: y + 6,
            head: [['Summary', 'Amount']],
            body: equityBody,
            theme: 'striped',
            headStyles: { fillColor: '#306754', fontStyle: 'bold' },
            columnStyles: { 1: { halign: 'right' } },
        });

        const fileName = `authority-presentation-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.pdf`;
        doc.save(fileName);
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in-50">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Authority presentation</CardTitle>
                    <CardDescription>
                        Snapshot of Owner&apos;s Equity / Net Worth at the start date, income and expense by
                        period (partial first month, full months, partial last month), purchases in the range,
                        closing equity at the end date, and the change in net worth over the range.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="space-y-2">
                        <span className="text-sm font-medium">Start date</span>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="min-w-[200px] justify-start">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? format(startDate, 'PPP') : 'Select date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <span className="text-sm font-medium">End date</span>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="min-w-[200px] justify-start">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, 'PPP') : 'Select date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button onClick={runReport} disabled={loading || !startDate || !endDate}>
                        {loading ? 'Building…' : 'Build report'}
                    </Button>
                    {report && !loading && (
                        <Button variant="outline" onClick={handleDownloadPdf} disabled={!authUser}>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                        </Button>
                    )}
                </CardContent>
            </Card>

            {error && (
                <p className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            )}

            {loading && (
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            )}

            {report && !loading && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-lg">Opening balance sheet</CardTitle>
                            <CardDescription>
                                As of {startDate ? format(startDate, 'PPP') : ''} (end of day), same basis as the
                                balance sheet screen.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <OverviewTables overview={report.opening} highlightEquity />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-lg">Income and expense by period</CardTitle>
                            <CardDescription>
                                Sales totals as income; expenses exclude internal transfer lines (same filter as
                                the expenses list).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Period</TableHead>
                                        <TableHead className="text-right">Income (sales)</TableHead>
                                        <TableHead className="text-right">Expense</TableHead>
                                        <TableHead className="text-right">Net (income − expense)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report.periods.map((row) => (
                                        <TableRow key={`${row.fromYmd}-${row.toYmd}`}>
                                            <TableCell>
                                                <div className="font-medium">{row.label}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {row.fromYmd} → {row.toYmd}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(row.income)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(row.expense)}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(row.net)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-lg">Purchases (books and items)</CardTitle>
                            <CardDescription>
                                All purchase records dated between the selected start and end (inclusive).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {report.purchases.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No purchases in this date range.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Supplier</TableHead>
                                            <TableHead>Items</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {report.purchases.map((p) => (
                                            <TableRow key={p.purchaseId}>
                                                <TableCell className="font-mono text-sm">{p.purchaseId}</TableCell>
                                                <TableCell>{format(new Date(p.date), 'PP')}</TableCell>
                                                <TableCell>{p.supplier}</TableCell>
                                                <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                                                    {p.itemSummary || '—'}
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(p.totalAmount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-lg">Closing balance sheet</CardTitle>
                            <CardDescription>As of {endDate ? format(endDate, 'PPP') : ''} (end of day).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <OverviewTables overview={report.closing} highlightEquity />
                        </CardContent>
                    </Card>

                    <Card className="border-primary/30 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="font-headline text-lg">
                                Change in Owner&apos;s Equity / Net Worth
                            </CardTitle>
                            <CardDescription>
                                Compares the same line as the balance sheet PDF: total assets minus payables, at
                                end of start day vs end of end day.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between gap-4">
                                <span>Equity at start</span>
                                <span className="font-medium">{formatCurrency(report.equityStart)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span>Equity at end</span>
                                <span className="font-medium">{formatCurrency(report.equityEnd)}</span>
                            </div>
                            <div className="flex justify-between gap-4 border-t pt-3 text-base font-semibold">
                                <span>Net change (profit if positive, loss if negative)</span>
                                <span className={report.equityDelta >= 0 ? 'text-green-700' : 'text-destructive'}>
                                    {formatCurrency(report.equityDelta)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

function OverviewTables({
    overview,
    highlightEquity,
}: {
    overview: {
        cash: number;
        bank: number;
        receivables: number;
        stockValue: number;
        officeAssetsValue: number;
        totalAssets: number;
        payables: number;
        equity: number;
    };
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
