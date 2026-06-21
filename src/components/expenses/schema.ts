import * as z from 'zod';

export const expenseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  date: z.date({ required_error: "An expense date is required." }),
  paymentMethod: z.enum(['Cash', 'Bank'], { required_error: "A payment method is required." }),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
