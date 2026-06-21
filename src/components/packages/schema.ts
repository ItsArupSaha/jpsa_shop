import * as z from 'zod';

export const saleItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
});

export const saleFormSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  date: z.date({ required_error: "A sale date is required." }),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  discountType: z.enum(['none', 'percentage', 'amount']),
  discountValue: z.coerce.number().min(0, 'Discount must be non-negative').default(0),
  paymentMethod: z.enum(['Cash', 'Bank', 'Due', 'Split', 'Paid by Credit'], { required_error: 'Payment method is required.' }),
  amountPaid: z.coerce.number().optional(),
  splitPaymentMethod: z.enum(['Cash', 'Bank']).optional(),
  creditApplied: z.coerce.number().optional(),
}).refine(data => {
  if (data.discountType === 'percentage') {
    return data.discountValue >= 0 && data.discountValue <= 100;
  }
  return true;
}, {
  message: "Percentage discount must be between 0 and 100.",
  path: ['discountValue'],
}).refine(data => {
  if (data.paymentMethod === 'Split') {
    return data.amountPaid !== undefined && data.amountPaid > 0 && !!data.splitPaymentMethod;
  }
  return true;
}, {
  message: "Amount paid and its method are required for split payments.",
  path: ['amountPaid'],
});

export type SaleFormValues = z.infer<typeof saleFormSchema>;

export const packageItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
});

export const packageFormSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  description: z.string().optional().default(''),
  items: z.array(packageItemSchema).min(1, 'At least one item is required'),
});

export type PackageFormValues = z.infer<typeof packageFormSchema>;
