
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { addPayment, getCustomersWithDueBalance } from '@/lib/actions';
import type { CustomerWithDue } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2 } from 'lucide-react';

const paymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  paymentMethod: z.enum(['Cash', 'Bank'], {
    required_error: 'You need to select a payment method.',
  }),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface ReceivePaymentDialogProps {
  customerId?: string;
  children: React.ReactNode;
}

export default function ReceivePaymentDialog({ customerId, children }: ReceivePaymentDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [customersWithDue, setCustomersWithDue] = React.useState<CustomerWithDue[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    async function loadCustomersWithDue() {
      if (isOpen && !customerId) {
        setIsLoadingCustomers(true);
        const dueCustomers = await getCustomersWithDueBalance();
        setCustomersWithDue(dueCustomers);
        setIsLoadingCustomers(false);
      }
    }
    
    loadCustomersWithDue();
  }, [isOpen, customerId]);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customerId: customerId || '',
      amount: 0,
      paymentMethod: 'Cash',
    },
  });

  React.useEffect(() => {
    form.reset({
      customerId: customerId || '',
      amount: 0,
      paymentMethod: 'Cash',
    });
  }, [customerId, form, isOpen]);


  const onSubmit = (data: PaymentFormValues) => {
    startTransition(async () => {
      try {
        await addPayment(data);
        toast({
          title: 'Payment Received',
          description: 'The customer payment has been successfully recorded.',
        });
        form.reset();
        setIsOpen(false);
        // This will trigger a re-fetch on the pages that use this dialog
        window.location.reload();
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
          <DialogTitle>Receive Due Payment</DialogTitle>
          <DialogDescription>
            Record a payment received from a customer for their outstanding balance.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             {!customerId && (
               <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          {isLoadingCustomers ? (
                            <span className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading customers...</span>
                          ) : (
                            <SelectValue placeholder="Select a customer" />
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customersWithDue.length > 0 ? customersWithDue.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} - (Due: ${c.dueBalance.toFixed(2)})
                          </SelectItem>
                        )) : (
                           <p className="p-4 text-sm text-muted-foreground">No customers with due balance found.</p>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Received</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
              <Button type="submit" disabled={isPending || isLoadingCustomers}>
                {isPending ? 'Saving...' : 'Save Payment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
