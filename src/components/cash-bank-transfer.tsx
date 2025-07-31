
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { getBalanceSheetData, recordTransfer } from '@/lib/actions';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from './ui/calendar';
import { Skeleton } from './ui/skeleton';

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

    const fetchBalances = React.useCallback(async () => {
        setIsLoadingBalances(true);
        try {
            const balanceData = await getBalanceSheetData(userId);
            setBalances({ cash: balanceData.cash, bank: balanceData.bank });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch account balances.' });
        } finally {
            setIsLoadingBalances(false);
        }
    }, [userId, toast]);
    
    React.useEffect(() => {
        fetchBalances();
    }, [fetchBalances]);

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
                description: `Successfully transferred $${data.amount} from ${data.from} to ${data.to}.`,
            });
            form.reset({ amount: 0, from: undefined, to: undefined, date: new Date() });
            await fetchBalances(); // Re-fetch balances after transfer
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
    
    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

    return (
        <div className="flex justify-center items-start pt-8">
            <Card className="w-full max-w-2xl animate-in fade-in-50">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Cash & Bank Transfer</CardTitle>
                    <CardDescription>
                        Move funds between your cash and bank accounts.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Current Cash Balance</p>
                            {isLoadingBalances ? <Skeleton className="h-7 w-24 mx-auto mt-1" /> : <p className="text-2xl font-bold">{formatCurrency(balances.cash)}</p>}
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
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
        </div>
    );
}
