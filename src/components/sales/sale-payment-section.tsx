'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function SalePaymentSection() {
  const { control, watch } = useFormContext();
  const watchDiscountType = watch('discountType');
  const watchPaymentMethod = watch('paymentMethod');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <FormLabel>Discount</FormLabel>
        <div className="flex gap-2">
          <FormField
            control={control}
            name="discountType"
            render={({ field }) => (
              <FormItem className="w-1/2">
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectPortal>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="amount">$</SelectItem>
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="discountValue"
            render={({ field }) => (
              <FormItem className={cn("w-1/2", watchDiscountType === 'none' && 'hidden')}>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
      <FormField
        control={control}
        name="paymentMethod"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>Payment Method</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value || 'Cash'}
                className="flex flex-wrap gap-4 pt-2"
              >
                <FormItem className="flex items-center space-x-2">
                  <FormControl><RadioGroupItem value="Cash" id="cash" /></FormControl>
                  <FormLabel htmlFor="cash" className="font-normal">Cash</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2">
                  <FormControl><RadioGroupItem value="Bank" id="bank" /></FormControl>
                  <FormLabel htmlFor="bank" className="font-normal">Bank</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2">
                  <FormControl><RadioGroupItem value="Due" id="due" /></FormControl>
                  <FormLabel htmlFor="due" className="font-normal">Due</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2">
                  <FormControl><RadioGroupItem value="Split" id="split" /></FormControl>
                  <FormLabel htmlFor="split" className="font-normal">Split</FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {watchPaymentMethod === 'Split' && (
        <div className='flex gap-4 items-end md:col-span-2'>
          <FormField
            control={control}
            name="amountPaid"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Amount Paid Now</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Enter amount paid" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="splitPaymentMethod"
            render={({ field }) => (
              <FormItem className="flex-1 space-y-3">
                <FormLabel>Paid Via</FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Cash" /></FormControl><FormLabel className="font-normal">Cash</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Bank" /></FormControl><FormLabel className="font-normal">Bank</FormLabel></FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
