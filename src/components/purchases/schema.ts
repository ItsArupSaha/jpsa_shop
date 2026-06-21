import * as z from 'zod';

export const purchaseItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  categoryName: z.string().min(1, 'Category name is required'),
  author: z.string().optional(),
  medicineGroup: z.string().optional(),
  company: z.string().optional(),
  expiryDate: z.string().optional(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  cost: z.coerce.number().min(0, 'Cost must be non-negative'),
  sellingPrice: z.coerce.number().optional(),
}).refine(data => {
    if (data.categoryName === 'Book') {
        return !!data.author && data.author.length > 0;
    }
    return true;
}, {
    message: "Author is required for books.",
    path: ['author'],
});

export const purchaseFormSchema = z.object({
  supplier: z.string().min(1, 'Supplier is required'),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required.'),
  discountType: z.enum(['amount', 'percentage']).default('amount'),
  discountValue: z.coerce.number().min(0, 'Discount must be non-negative').optional(),
  paymentMethod: z.enum(['Cash', 'Bank', 'Due', 'Split'], { required_error: 'Payment method is required.'}),
  amountPaid: z.coerce.number().optional(),
  splitPaymentMethod: z.enum(['Cash', 'Bank']).optional(),
  dueDate: z.date({ required_error: "A due date is required." }),
}).refine(data => {
    if (data.paymentMethod === 'Split') {
        return data.amountPaid !== undefined && data.amountPaid > 0 && !!data.splitPaymentMethod;
    }
    return true;
}, {
    message: "Amount paid and its method are required for split payments.",
    path: ['amountPaid'],
});

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;
