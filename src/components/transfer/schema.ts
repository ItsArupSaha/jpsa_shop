import * as z from 'zod';

export const transferSchema = z.object({
    from: z.enum(['Cash', 'Bank'], { required_error: 'Please select a source.' }),
    to: z.enum(['Cash', 'Bank'], { required_error: 'Please select a destination.' }),
    amount: z.coerce.number().min(0.01, 'Amount must be positive'),
    date: z.date({ required_error: "A transfer date is required." }),
}).refine(data => data.from !== data.to, {
    message: "Source and destination cannot be the same.",
    path: ['to'],
});

export type TransferFormValues = z.infer<typeof transferSchema>;
