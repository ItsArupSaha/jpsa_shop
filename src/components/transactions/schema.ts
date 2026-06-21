import * as z from 'zod';

export const transactionSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  dueDate: z.date({ required_error: "A due date is required." }),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
