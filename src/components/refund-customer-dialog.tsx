'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { refundCustomerOverpayment } from '@/lib/actions';
import type { CustomerWithDue } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

interface RefundCustomerDialogProps {
    customer: CustomerWithDue;
    userId: string;
    onRefundSuccess: () => void;
    children: React.ReactNode;
}

export default function RefundCustomerDialog({ customer, userId, children, onRefundSuccess }: RefundCustomerDialogProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isPending, startTransition] = React.useTransition();
    const { toast } = useToast();

    const maxRefundableAmount = Math.abs(customer.dueBalance);

    const refundSchema = React.useMemo(() => z.object({
        amount: z.coerce.number()
            .min(0.01, 'Amount must be greater than 0')
            .max(maxRefundableAmount, `Amount cannot exceed the overpaid balance (৳${maxRefundableAmount})`),
        paymentMethod: z.enum(['Cash', 'Bank'], {
            required_error: 'You need to select a refund method.',
        }),
    }), [maxRefundableAmount]);

    type RefundFormValues = z.infer<typeof refundSchema>;

    const form = useForm<RefundFormValues>({
        resolver: zodResolver(refundSchema),
        defaultValues: {
            amount: maxRefundableAmount,
            paymentMethod: 'Cash',
        },
    });

    React.useEffect(() => {
        form.reset({
            amount: maxRefundableAmount,
            paymentMethod: 'Cash',
        });
    }, [maxRefundableAmount, form, isOpen]);

    const onSubmit = (data: RefundFormValues) => {
        startTransition(async () => {
            try {
                await refundCustomerOverpayment(userId, {
                    customerId: customer.id,
                    amount: data.amount,
                    paymentMethod: data.paymentMethod
                });
                toast({
                    title: 'Refund Successful',
                    description: 'The refund has been recorded as an expense and customer balance updated.',
                });
                onRefundSuccess();
                setIsOpen(false);
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to record refund.',
                });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Refund Overpayment</DialogTitle>
                    <DialogDescription>
                        Refund a customer who has overpaid their due balance.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted p-3 mt-4 rounded-md">
                    <p className="text-sm font-medium mb-1">Customer: {customer.name}</p>
                    <p className="text-sm">Overpaid Amount: <span className="font-bold text-emerald-600">৳{maxRefundableAmount.toFixed(2)}</span></p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Refund Amount</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" max={maxRefundableAmount} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Refund Method (Expense)</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex gap-4"
                                        >
                                            <FormItem className="flex items-center space-x-2">
                                                <FormControl><RadioGroupItem value="Cash" /></FormControl>
                                                <FormLabel className="font-normal">Cash</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2">
                                                <FormControl><RadioGroupItem value="Bank" /></FormControl>
                                                <FormLabel className="font-normal">Bank</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Processing...' : 'Issue Refund'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
