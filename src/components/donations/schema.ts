import * as z from 'zod';

export const donationSchema = z.object({
  donorName: z.string().min(1, 'Donor name is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  date: z.date({ required_error: "A donation date is required." }),
  paymentMethod: z.enum(['Cash', 'Bank'], { required_error: "A payment method is required." }),
  notes: z.string().optional(),
});

export type DonationFormValues = z.infer<typeof donationSchema>;
