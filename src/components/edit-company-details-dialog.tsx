
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateCompanyDetails } from '@/lib/actions';
import type { AuthUser } from '@/lib/types';
import { useRouter } from 'next/navigation';

const companyDetailsSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters.'),
  subtitle: z.string().optional(),
  address: z.string().min(5, 'Please enter a valid address.'),
  phone: z.string().min(5, 'Please enter a valid phone number.'),
  bkashNumber: z.string().optional(),
  bankInfo: z.string().optional(),
  secretKey: z.string().optional(),
});

type CompanyDetailsFormValues = z.infer<typeof companyDetailsSchema>;

interface EditCompanyDetailsDialogProps {
  user: AuthUser;
  children: React.ReactNode;
}

export function EditCompanyDetailsDialog({ user, children }: EditCompanyDetailsDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CompanyDetailsFormValues>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: {
      companyName: user.companyName || '',
      subtitle: user.subtitle || '',
      address: user.address || '',
      phone: user.phone || '',
      bkashNumber: user.bkashNumber || '',
      bankInfo: user.bankInfo || '',
      secretKey: '', // Always start empty, user will fill it if they need to
    },
  });

  const onSubmit = async (data: CompanyDetailsFormValues) => {
    setIsSubmitting(true);
    try {
      await updateCompanyDetails(user.uid, data);
      toast({
        title: 'Details Updated!',
        description: 'Your store information has been successfully saved.',
      });
      setIsOpen(false);
      // Force a reload to reflect changes everywhere, especially in the layout
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not save your store details. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Edit Store Details</DialogTitle>
          <DialogDescription>
            Update the information for your bookstore. This will be reflected in reports and memos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 py-1">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., The Reading Nook" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-title (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="A cozy corner for book lovers" {...field} />
                    </FormControl>
                    <FormDescription>
                        A short, descriptive tagline for your store.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Your primary contact number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bkashNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bkash Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Bkash account number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="123 Bookworm Lane, Readsville, USA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Details (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Bank Name, Account Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!user.secretKey && (
                <FormField
                  control={form.control}
                  name="secretKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secret Key (Set Once)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your secret key" {...field} />
                      </FormControl>
                      <FormDescription>
                        This key is for future integrations and can only be set once. It cannot be changed later.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <DialogFooter className="pt-4 border-t">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
