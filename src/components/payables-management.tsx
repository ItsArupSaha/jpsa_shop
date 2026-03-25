'use client';

import { getCustomersWithNegativeBalance, getPaidPayables, getPaidPayablesForDateRange, getTransactionsPaginated } from '@/lib/actions';
import { getPayablesAsOfDate } from '@/lib/db/account-overview';
import type { CustomerWithDue, Transaction } from '@/lib/types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FileSpreadsheet, FileText, Loader2, DollarSign } from 'lucide-react';
import * as React from 'react';
import * as XLSX from 'xlsx';

import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { DateRange } from 'react-day-picker';
import PayPayableDialog from './pay-payable-dialog';
import RefundCustomerDialog from './refund-customer-dialog';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';

interface PayablesManagementProps {
    userId: string;
}

export default function PayablesManagement({ userId }: PayablesManagementProps) {
    const { authUser } = useAuth();

    // States for pending payables
    const [payables, setPayables] = React.useState<Transaction[]>([]);
    const [hasMorePayables, setHasMorePayables] = React.useState(true);
    const [isInitialLoadingPayables, setIsInitialLoadingPayables] = React.useState(true);
    const [isLoadingMorePayables, setIsLoadingMorePayables] = React.useState(false);

    // States for customer overpayments
    const [overpaidCustomers, setOverpaidCustomers] = React.useState<CustomerWithDue[]>([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = React.useState(true);

    // States for paid payables (history)
    const [paidPayables, setPaidPayables] = React.useState<Transaction[]>([]);
    const [isLoadingPaid, setIsLoadingPaid] = React.useState(true);

    // Reporting states
    const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
    const [asOfDate, setAsOfDate] = React.useState<Date | undefined>();
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
    const [reportType, setReportType] = React.useState<'pending' | 'paid'>('pending');

    const { toast } = useToast();

    const loadPendingPayables = React.useCallback(async () => {
        setIsInitialLoadingPayables(true);
        try {
            const { transactions, hasMore } = await getTransactionsPaginated({ userId, type: 'Payable', pageLimit: 10 });
            setPayables(transactions);
            setHasMorePayables(hasMore);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load payables.' });
        } finally {
            setIsInitialLoadingPayables(false);
        }
    }, [userId, toast]);

    const loadOverpaidCustomers = React.useCallback(async () => {
        setIsLoadingCustomers(true);
        try {
            const customers = await getCustomersWithNegativeBalance(userId);
            setOverpaidCustomers(customers);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load customer overpayments.' });
        } finally {
            setIsLoadingCustomers(false);
        }
    }, [userId, toast]);

    const loadPaidPayables = React.useCallback(async () => {
        setIsLoadingPaid(true);
        try {
            const paid = await getPaidPayables(userId);
            setPaidPayables(paid);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load paid payables.' });
        } finally {
            setIsLoadingPaid(false);
        }
    }, [userId, toast]);

    const loadAllData = React.useCallback(() => {
        loadPendingPayables();
        loadOverpaidCustomers();
        loadPaidPayables();
    }, [loadPendingPayables, loadOverpaidCustomers, loadPaidPayables]);

    React.useEffect(() => {
        if (userId) {
            loadAllData();
        }
    }, [userId, loadAllData]);

    const handleLoadMorePayables = async () => {
        if (!hasMorePayables || isLoadingMorePayables) return;
        setIsLoadingMorePayables(true);
        try {
            const lastTransactionId = payables[payables.length - 1]?.id;
            const { transactions, hasMore } = await getTransactionsPaginated({ userId, type: 'Payable', pageLimit: 10, lastVisibleId: lastTransactionId });
            setPayables(prev => [...prev, ...transactions]);
            setHasMorePayables(hasMore);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load more payables.' });
        } finally {
            setIsLoadingMorePayables(false);
        }
    };

    const handleDownload = async (formatType: 'pdf' | 'xlsx') => {
        if (!authUser) return;

        if (reportType === 'pending') {
            await handlePendingPayablesReport(formatType);
        } else {
            await handlePaidPayablesReport(formatType);
        }
        setIsDownloadDialogOpen(false);
    };

    const handlePendingPayablesReport = async (formatType: 'pdf' | 'xlsx') => {
        let data;
        const targetDate = asOfDate || new Date();

        if (asOfDate) {
            data = await getPayablesAsOfDate(userId, targetDate);
        } else {
            // Current pending
            data = await getTransactionsPaginated({ userId, type: 'Payable', pageLimit: 1000 }).then(res => res.transactions);
        }

        if (data.length === 0) {
            toast({ variant: 'destructive', title: 'No Data', description: 'There are no pending payables to download.' });
            return;
        }

        if (formatType === 'pdf') {
            generatePendingPayablesPdf(data, targetDate);
        } else {
            generatePendingPayablesXlsx(data, targetDate);
        }
    };

    const handlePaidPayablesReport = async (formatType: 'pdf' | 'xlsx') => {
        if (!dateRange?.from) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a date range for the report.' });
            return;
        }

        const paid = await getPaidPayablesForDateRange(userId, dateRange.from, dateRange.to);

        if (paid.length === 0) {
            toast({ variant: 'destructive', title: 'No Data', description: 'No paid payables found in this date range.' });
            return;
        }

        if (formatType === 'pdf') {
            generatePaidPayablesPdf(paid, dateRange.from, dateRange.to);
        } else {
            generatePaidPayablesXlsx(paid, dateRange.from, dateRange.to);
        }
    };

    const generatePendingPayablesPdf = (data: Transaction[], date: Date) => {
        const doc = new jsPDF();
        const validDate = date && !isNaN(date.getTime()) ? date : new Date();
        const dateString = format(validDate, 'PPP');

        const totalAmount = data.reduce((sum, t) => sum + (t.amount || 0), 0);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(authUser!.companyName || 'Bookstore', 14, 20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(authUser!.address || '', 14, 26);
        doc.text(authUser!.phone || '', 14, 32);

        let yPos = 20;
        if (authUser!.bkashNumber) {
            doc.text(`Bkash: ${authUser!.bkashNumber}`, 200, yPos, { align: 'right' });
            yPos += 6;
        }
        if (authUser!.bankInfo) {
            doc.text(`Bank: ${authUser!.bankInfo}`, 200, yPos, { align: 'right' });
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Pending Payables Report', 105, 45, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`As of ${dateString}`, 105, 51, { align: 'center' });
        doc.setTextColor(0);

        autoTable(doc, {
            startY: 60,
            head: [['Description', 'Due Date', 'Amount']],
            body: data.map(t => [
                t.description,
                format(new Date(t.dueDate), 'yyyy-MM-dd'),
                `BDT ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.amount)}`
            ]),
            foot: [[
                { content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                `BDT ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalAmount)}`
            ]],
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        });
        doc.save(`pending-payables-${format(validDate, 'yyyy-MM-dd')}.pdf`);
    };

    const generatePendingPayablesXlsx = (data: Transaction[], date: Date) => {
        const validDate = date && !isNaN(date.getTime()) ? date : new Date();
        const dataToExport = data.map(t => ({
            'Description': t.description,
            'Due Date': format(new Date(t.dueDate), 'yyyy-MM-dd'),
            'Amount': t.amount,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Pending Payables');
        XLSX.writeFile(workbook, `pending-payables-${format(validDate, 'yyyy-MM-dd')}.xlsx`);
    };

    const generatePaidPayablesPdf = (data: Transaction[], fromDate: Date, toDate?: Date) => {
        const doc = new jsPDF();
        const totalAmount = data.reduce((sum, t) => sum + (t.amount || 0), 0);
        const dateString = toDate
            ? `${format(fromDate, 'PPP')} - ${format(toDate, 'PPP')}`
            : format(fromDate, 'PPP');

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(authUser!.companyName || 'Bookstore', 14, 20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(authUser!.address || '', 14, 26);
        doc.text(authUser!.phone || '', 14, 32);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Paid Payables Report', 105, 45, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`For the period: ${dateString}`, 105, 51, { align: 'center' });
        doc.setTextColor(0);

        autoTable(doc, {
            startY: 60,
            head: [['Description', 'Date Paid', 'Amount']],
            body: data.map(t => [
                t.description,
                format(new Date(t.dueDate), 'yyyy-MM-dd'),
                `BDT ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.amount)}`
            ]),
            foot: [[
                { content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                `BDT ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalAmount)}`
            ]],
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        });
        doc.save(`paid-payables-${format(fromDate, 'yyyy-MM-dd')}.pdf`);
    };

    const generatePaidPayablesXlsx = (data: Transaction[], fromDate: Date, toDate?: Date) => {
        const dataToExport = data.map(t => ({
            'Description': t.description,
            'Date Paid': format(new Date(t.dueDate), 'yyyy-MM-dd'),
            'Amount': t.amount,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Paid Payables');
        XLSX.writeFile(workbook, `paid-payables-${format(fromDate, 'yyyy-MM-dd')}.xlsx`);
    };

    return (
        <>
            <Card className="animate-in fade-in-50">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="font-headline text-2xl">Track Payables</CardTitle>
                            <CardDescription>Manage bills, supplier payments, and customer refunds.</CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <Download className="mr-2 h-4 w-4" /> Download Report
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DialogTrigger asChild>
                                            <DropdownMenuItem onClick={() => setReportType('pending')}>
                                                <FileText className="mr-2 h-4 w-4" />
                                                <span>Pending Payables Report</span>
                                            </DropdownMenuItem>
                                        </DialogTrigger>
                                        <DialogTrigger asChild>
                                            <DropdownMenuItem onClick={() => setReportType('paid')}>
                                                <FileText className="mr-2 h-4 w-4" />
                                                <span>Paid Payables Report</span>
                                            </DropdownMenuItem>
                                        </DialogTrigger>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Download Report</DialogTitle>
                                        <DialogDescription>
                                            {reportType === 'pending'
                                                ? 'Download pending payables as of a specific date.'
                                                : 'Select a date range for exact paid payables.'}
                                        </DialogDescription>
                                    </DialogHeader>

                                    {reportType === 'pending' && (
                                        <ScrollArea className="max-h-[calc(100vh-20rem)] overflow-y-auto">
                                            <div className="py-4 flex flex-col items-center">
                                                <div className="mb-2 text-sm text-center text-muted-foreground w-full px-4">
                                                    <p>Select an &quot;As of&quot; date.</p>
                                                    <p className="text-xs">Leave empty for today (current balance).</p>
                                                </div>
                                                <Calendar
                                                    initialFocus
                                                    mode="single"
                                                    selected={asOfDate}
                                                    onSelect={setAsOfDate}
                                                />
                                                {asOfDate && (
                                                    <Button
                                                        variant="outline"
                                                        className="mt-2"
                                                        onClick={() => setAsOfDate(undefined)}
                                                    >
                                                        Clear Date (Use Today)
                                                    </Button>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    )}

                                    {reportType === 'paid' && (
                                        <ScrollArea className="max-h-[calc(100vh-20rem)] overflow-y-auto">
                                            <div className="py-4 flex flex-col items-center">
                                                <div className="mb-2 text-sm text-center text-muted-foreground w-full px-4">
                                                    <p>Select a date range for the report.</p>
                                                </div>
                                                <Calendar
                                                    initialFocus
                                                    mode="range"
                                                    defaultMonth={dateRange?.from}
                                                    selected={dateRange}
                                                    onSelect={setDateRange}
                                                    numberOfMonths={1}
                                                />
                                            </div>
                                        </ScrollArea>
                                    )}

                                    <DialogFooter className="gap-2 sm:justify-center pt-4 border-t">
                                        <Button variant="outline" onClick={() => handleDownload('pdf')}>
                                            <FileText className="mr-2 h-4 w-4" /> Download PDF
                                        </Button>
                                        <Button variant="outline" onClick={() => handleDownload('xlsx')}>
                                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>

                {/* Pending Payables Section */}
                <CardContent>
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold font-headline mb-2">Pending Payables</h3>
                        <p className="text-sm text-muted-foreground">Purchases on due and manually added payables that you owe.</p>
                    </div>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="w-32 text-center">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isInitialLoadingPayables ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={`skeleton-p-${i}`}>
                                            <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : payables.length > 0 ? payables.map((payable) => (
                                    <TableRow key={payable.id}>
                                        <TableCell className="font-medium">{payable.description}</TableCell>
                                        <TableCell>{format(new Date(payable.dueDate), 'PPP')}</TableCell>
                                        <TableCell className="text-right font-bold text-destructive">৳{payable.amount.toFixed(2)}</TableCell>
                                        <TableCell className="text-center">
                                            <PayPayableDialog payable={payable} userId={userId} onPaymentSuccess={loadAllData}>
                                                <Button size="sm" variant="outline" className="w-full whitespace-nowrap">
                                                    <DollarSign className="w-3 h-3 mr-1" /> Pay
                                                </Button>
                                            </PayPayableDialog>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No pending payables right now.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {hasMorePayables && (
                        <div className="flex justify-center mt-4">
                            <Button onClick={handleLoadMorePayables} disabled={isLoadingMorePayables}>
                                {isLoadingMorePayables ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</> : 'Load More Payables'}
                            </Button>
                        </div>
                    )}
                </CardContent>

                {/* Customer Overpayments Section */}
                <CardContent className="border-t pt-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold font-headline text-emerald-600 mb-2">Customer Overpayments</h3>
                        <p className="text-sm text-muted-foreground">Customers who paid more than they owed. You owe them this amount.</p>
                    </div>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead className="text-right">Overpaid</TableHead>
                                    <TableHead className="w-32 text-center">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingCustomers ? (
                                    Array.from({ length: 2 }).map((_, i) => (
                                        <TableRow key={`skeleton-c-${i}`}>
                                            <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : overpaidCustomers.length > 0 ? overpaidCustomers.map((customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell className="font-medium">{customer.name}</TableCell>
                                        <TableCell>{customer.phone}</TableCell>
                                        <TableCell className="text-right font-bold text-emerald-600">৳{Math.abs(customer.dueBalance).toFixed(2)}</TableCell>
                                        <TableCell className="text-center">
                                            <RefundCustomerDialog customer={customer} userId={userId} onRefundSuccess={loadAllData}>
                                                <Button size="sm" variant="outline" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 whitespace-nowrap">
                                                    <DollarSign className="w-3 h-3 mr-1" /> Refund
                                                </Button>
                                            </RefundCustomerDialog>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No customer overpayments recorded.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>

                {/* Paid Payables Section */}
                <CardContent className="border-t pt-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold font-headline mb-2">Paid History</h3>
                        <p className="text-sm text-muted-foreground">History of completed and partial payments towards your payables.</p>
                    </div>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Date Paid</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingPaid ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={`paid-skeleton-${i}`}>
                                            <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paidPayables.length > 0 ? paidPayables.map((transaction) => (
                                    <TableRow key={transaction.id}>
                                        <TableCell className="font-medium">{transaction.description}</TableCell>
                                        <TableCell>{format(new Date(transaction.dueDate), 'PPP')}</TableCell>
                                        <TableCell>{transaction.paymentMethod || 'Cash'}</TableCell>
                                        <TableCell className="text-right text-primary font-bold">৳{transaction.amount.toFixed(2)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                            No paid payables yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
