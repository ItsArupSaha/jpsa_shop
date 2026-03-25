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
import { payPayable } from '@/lib/actions';
import type { Transaction } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

interface PayPayableDialogProps {
    payable: Transaction;
    userId: string;
    onPaymentSuccess: () => void;
    children: React.ReactNode;
}

export default function PayPayableDialog({ payable, userId, children, onPaymentSuccess }: PayPayableDialogProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isPending, startTransition] = React.useTransition();
    const { toast } = useToast();

    const paymentSchema = React.useMemo(() => z.object({
        amount: z.coerce.number()
            .min(0.01, 'Amount must be greater than 0')
            .max(payable.amount, `Amount cannot exceed the current payable amount (৳${payable.amount})`),
        paymentMethod: z.enum(['Cash', 'Bank'], {
            required_error: 'You need to select a payment method.',
        }),
    }), [payable.amount]);

    type PaymentFormValues = z.infer<typeof paymentSchema>;

    const form = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            amount: payable.amount,
            paymentMethod: 'Cash',
        },
    });

    React.useEffect(() => {
        form.reset({
            amount: payable.amount,
            paymentMethod: 'Cash',
        });
    }, [payable.amount, form, isOpen]);

    const onSubmit = (data: PaymentFormValues) => {
        startTransition(async () => {
            try {
                await payPayable(userId, {
                    transactionId: payable.id,
                    amount: data.amount,
                    paymentMethod: data.paymentMethod
                });
                toast({
                    title: 'Payment Successful',
                    description: 'The payable amount has been updated.',
                });
                onPaymentSuccess();
                setIsOpen(false);
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to record payment.',
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
                    <DialogTitle>Pay Payable Account</DialogTitle>
                    <DialogDescription>
                        Record a partial or full payment for this payable.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted p-3 mt-4 rounded-md">
                    <p className="text-sm font-medium mb-1">{payable.description}</p>
                    <p className="text-sm">Current Balance: <span className="font-bold text-destructive">৳{payable.amount.toFixed(2)}</span></p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount to Pay</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" max={payable.amount} {...field} />
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
                                    <FormLabel>Payment Method</FormLabel>
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
                                {isPending ? 'Processing...' : 'Make Payment'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
