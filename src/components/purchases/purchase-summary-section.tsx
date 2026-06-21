'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';

export function PurchaseSummarySection() {
  const { watch } = useFormContext();
  const watchItems = watch('items') || [];
  const watchPaymentMethod = watch('paymentMethod');
  const watchAmountPaid = watch('amountPaid') || 0;
  const watchDiscountType = watch('discountType');
  const watchDiscountValue = watch('discountValue') || 0;

  const totalAmount = React.useMemo(() => {
    return watchItems.reduce((acc: number, item: any) => {
      const cost = item?.cost || 0;
      const quantity = Number(item?.quantity) || 0;
      return acc + (cost * quantity);
    }, 0);
  }, [watchItems]);

  const discountAmount = React.useMemo(() => {
    const discountValueParams = Number(watchDiscountValue) || 0;
    return watchDiscountType === 'percentage' 
      ? (totalAmount * discountValueParams) / 100 
      : discountValueParams;
  }, [totalAmount, watchDiscountType, watchDiscountValue]);
    
  const finalAmount = React.useMemo(() => {
    return totalAmount - discountAmount;
  }, [totalAmount, discountAmount]);

  const dueAmount = React.useMemo(() => {
    if (watchPaymentMethod === 'Due') {
      return finalAmount;
    }
    if (watchPaymentMethod === 'Split') {
      return finalAmount - (Number(watchAmountPaid) || 0);
    }
    return 0;
  }, [finalAmount, watchPaymentMethod, watchAmountPaid]);

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between font-bold text-base">
        <span>Total Amount</span>
        <span>৳{totalAmount.toFixed(2)}</span>
      </div>
      {discountAmount > 0 && (
        <div className="flex justify-between font-medium text-green-600">
          <span>Discount</span>
          <span>-৳{discountAmount.toFixed(2)}</span>
        </div>
      )}
      {discountAmount > 0 && (
        <div className="flex justify-between font-bold text-base">
          <span>Net Payable</span>
          <span>৳{finalAmount.toFixed(2)}</span>
        </div>
      )}
      {(watchPaymentMethod === 'Due' || watchPaymentMethod === 'Split') && (
        <div className="flex justify-between font-semibold text-destructive">
          <span>Due Amount</span>
          <span>৳{dueAmount.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
