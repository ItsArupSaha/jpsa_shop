

'use client';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getAccountBalances, getTransfersPaginated, recordTransfer } from '@/lib/actions';
import type { Transfer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Skeleton } from './ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const transferSchema = z.object({
    from: z.enum(['Cash', 'Bank'], { required_error: 'Please select a source.' }),
    to: z.enum(['Cash', 'Bank'], { required_error: 'Please select a destination.' }),
    amount: z.coerce.number().min(0.01, 'Amount must be positive'),
    date: z.date({ required_error: "A transfer date is required." }),
}).refine(data => data.from !== data.to, {
    message: "Source and destination cannot be the same.",
    path: ['to'],
});

type TransferFormValues = z.infer<typeof transferSchema>;

interface CashBankTransferProps {
    userId: string;
}

export default function CashBankTransfer({ userId }: CashBankTransferProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isLoadingBalances, setIsLoadingBalances] = React.useState(true);
    const [balances, setBalances] = React.useState({ cash: 0, bank: 0 });

    const [transfers, setTransfers] = React.useState<Transfer[]>([]);
    const [isLoadingTransfers, setIsLoadingTransfers] = React.useState(true);
    const [hasMore, setHasMore] = React.useState(true);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);

    const fetchBalances = React.useCallback(async () => {
        setIsLoadingBalances(true);
        try {
            const balanceData = await getAccountBalances(userId);
            setBalances({ cash: balanceData.cash, bank: balanceData.bank });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch account balances.' });
        } finally {
            setIsLoadingBalances(false);
        }
    }, [userId, toast]);

    const fetchTransfers = React.useCallback(async () => {
        setIsLoadingTransfers(true);
        try {
            const { transfers, hasMore } = await getTransfersPaginated({ userId, pageLimit: 5 });
            setTransfers(transfers);
            setHasMore(hasMore);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch transfer history.' });
        } finally {
            setIsLoadingTransfers(false);
        }
    }, [userId, toast]);

    React.useEffect(() => {
        if (userId) {
            fetchBalances();
            fetchTransfers();
        }
    }, [userId, fetchBalances, fetchTransfers]);

    const handleLoadMore = async () => {
        if (!hasMore || isLoadingMore) return;
        setIsLoadingMore(true);
        const lastTransferId = transfers[transfers.length - 1]?.id;
        try {
            const { transfers: newTransfers, hasMore: newHasMore } = await getTransfersPaginated({ userId, pageLimit: 5, lastVisibleId: lastTransferId });
            setTransfers(prev => [...prev, ...newTransfers]);
            setHasMore(newHasMore);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load more transfers.' });
        } finally {
            setIsLoadingMore(false);
        }
    };

    const form = useForm<TransferFormValues>({
        resolver: zodResolver(transferSchema),
        defaultValues: {
            amount: 0,
            date: new Date(),
        },
    });

    const onSubmit = async (data: TransferFormValues) => {
        setIsSubmitting(true);
        try {
            await recordTransfer(userId, data);
            toast({
                title: 'Transfer Successful',
                description: `Successfully transferred ৳${data.amount} from ${data.from} to ${data.to}.`,
            });
            form.reset({ amount: 0, from: undefined, to: undefined, date: new Date() });
            await fetchBalances(); // Re-fetch balances after transfer
            await fetchTransfers(); // Re-fetch transfers list
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Uh oh! Something went wrong.',
                description: error instanceof Error ? error.message : 'Could not record the transfer. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

    return (
        <div className="space-y-6">
            <Card className="w-full animate-in fade-in-50">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Cash & Bank Transfer</CardTitle>
                    <CardDescription>
                        Move funds between your cash and bank accounts.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-muted rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">Current Cash Balance</p>
                            {isLoadingBalances ? <Skeleton className="h-7 w-24 mx-auto mt-1" /> : <p className="text-2xl font-bold">{formatCurrency(balances.cash)}</p>}
                        </div>
                        <div className="p-4 bg-muted rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">Current Bank Balance</p>
                            {isLoadingBalances ? <Skeleton className="h-7 w-24 mx-auto mt-1" /> : <p className="text-2xl font-bold">{formatCurrency(balances.bank)}</p>}
                        </div>
                    </div>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="from"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>From</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="Cash" /></FormControl>
                                                        <FormLabel className="font-normal">Cash</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="Bank" /></FormControl>
                                                        <FormLabel className="font-normal">Bank</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="to"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>To</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="Cash" /></FormControl>
                                                        <FormLabel className="font-normal">Cash</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="Bank" /></FormControl>
                                                        <FormLabel className="font-normal">Bank</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Transfer Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-[240px] pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => date > new Date()}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <CardFooter className="px-0 pt-6">
                                <Button type="submit" disabled={isSubmitting || isLoadingBalances}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirm Transfer
                                </Button>
                            </CardFooter>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card className="w-full animate-in fade-in-50">
                <CardHeader>
                    <CardTitle className="font-headline text-xl">Transfer History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingTransfers ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={`skeleton-${i}`}>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : transfers.length > 0 ? (
                                    transfers.map((transfer) => (
                                        <TableRow key={transfer.id}>
                                            <TableCell>{format(new Date(transfer.date), 'PPP')}</TableCell>
                                            <TableCell>{transfer.description}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(transfer.amount)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">No transfers recorded yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {hasMore && (
                        <div className="flex justify-center mt-4">
                            <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
                                {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Load More
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
