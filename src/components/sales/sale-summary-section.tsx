'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';

interface SaleSummarySectionProps {
  customerCredit: number;
}

export function SaleSummarySection({ customerCredit }: SaleSummarySectionProps) {
  const { watch, setValue } = useFormContext();
  const watchItems = watch('items') || [];
  const watchDiscountType = watch('discountType');
  const watchDiscountValue = watch('discountValue') || 0;
  const watchPaymentMethod = watch('paymentMethod');
  const watchAmountPaid = watch('amountPaid') || 0;

  const subtotal = React.useMemo(() => {
    return watchItems.reduce((acc: number, item: any) => {
      const price = item?.price || 0;
      const quantity = Number(item?.quantity) || 0;
      return acc + (price * quantity);
    }, 0);
  }, [watchItems]);

  const discountAmount = React.useMemo(() => {
    let disc = 0;
    if (watchDiscountType === 'percentage') {
      disc = subtotal * (Number(watchDiscountValue) / 100);
    } else if (watchDiscountType === 'amount') {
      disc = Number(watchDiscountValue);
    }
    return Math.min(subtotal, disc);
  }, [subtotal, watchDiscountType, watchDiscountValue]);

  const total = React.useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);

  const creditToApply = React.useMemo(() => Math.min(total, customerCredit), [total, customerCredit]);

  const totalAfterCredit = React.useMemo(() => total - creditToApply, [total, creditToApply]);

  // Sync side effects
  React.useEffect(() => {
    setValue('creditApplied', creditToApply);
    if (totalAfterCredit <= 0 && total > 0) {
      setValue('paymentMethod', 'Paid by Credit');
    } else if (watchPaymentMethod === 'Paid by Credit') {
      setValue('paymentMethod', 'Cash');
    }
  }, [totalAfterCredit, total, creditToApply, setValue, watchPaymentMethod]);

  const dueAmount = React.useMemo(() => {
    if (watchPaymentMethod === 'Due') {
      return totalAfterCredit;
    }
    if (watchPaymentMethod === 'Split') {
      return totalAfterCredit - (Number(watchAmountPaid) || 0);
    }
    return 0;
  }, [totalAfterCredit, watchPaymentMethod, watchAmountPaid]);

  return (
    <div className="space-y-2 text-sm pr-4">
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>৳{subtotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Discount</span>
        <span>-৳{discountAmount.toFixed(2)}</span>
      </div>
      {creditToApply > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Credit Applied</span>
          <span>-৳{creditToApply.toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-base border-t pt-2">
        <span>Total</span>
        <span>৳{totalAfterCredit.toFixed(2)}</span>
      </div>
      {(watchPaymentMethod === 'Due' || watchPaymentMethod === 'Split') && (
        <div className="flex justify-between font-semibold text-destructive">
          <span>Due Amount</span>
          <span>৳{dueAmount.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
