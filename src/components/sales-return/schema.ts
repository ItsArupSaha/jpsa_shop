import * as z from 'zod';

export const salesReturnItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number(), // This is the original selling price
});

export const salesReturnFormSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  items: z.array(salesReturnItemSchema).min(1, 'At least one item is required.'),
});

export type SalesReturnFormValues = z.infer<typeof salesReturnFormSchema>;
