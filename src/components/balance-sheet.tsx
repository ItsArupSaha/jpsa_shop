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
import { useAuth } from '@/hooks/use-auth';
import { getAccountOverview } from '@/lib/actions';
import { CalendarIcon, Download } from 'lucide-react';
import { exportBalanceSheetPdf } from './balance-sheet/balance-sheet-pdf';
import { BalanceSheetTables } from './balance-sheet/balance-sheet-tables';

interface BalanceSheetProps {
    userId: string;
}

type Overview = Awaited<ReturnType<typeof getAccountOverview>>;

const formatCurrency = (amount: number) =>
    `BDT ${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

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
        if (!current) return;
        exportBalanceSheetPdf(current, effectiveDate, asOfDate, authUser);
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

                        <BalanceSheetTables
                            current={current}
                            formatCurrency={formatCurrency}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
