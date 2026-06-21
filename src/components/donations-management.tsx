'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { DateRange } from 'react-day-picker';
import { Download, FileSpreadsheet, FileText, Loader2, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

import { addDonation, getDonations, getDonationsPaginated } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { Donation } from '@/lib/types';

import { donationSchema, type DonationFormValues } from './donations/schema';
import { RecordDonationDialog } from './donations/record-donation-dialog';
import { exportDonationsToPdf, exportDonationsToXlsx } from './donations/donations-export-utils';
import { DonationsTable } from './donations/donations-table';

interface DonationsManagementProps {
  userId: string;
}

export default function DonationsManagement({ userId }: DonationsManagementProps) {
  const { authUser } = useAuth();
  const [donations, setDonations] = React.useState<Donation[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    const { donations: newDonations, hasMore: newHasMore } = await getDonationsPaginated({
      userId,
      pageLimit: 10,
    });
    setDonations(newDonations);
    setHasMore(newHasMore);
    setIsInitialLoading(false);
  }, [userId]);

  React.useEffect(() => {
    if (userId) {
      loadInitialData();
    }
  }, [userId, loadInitialData]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastDonationId = donations.length > 0 ? donations[donations.length - 1]?.id : undefined;
    const { donations: newDonations, hasMore: newHasMore } = await getDonationsPaginated({
      userId,
      pageLimit: 10,
      lastVisibleId: lastDonationId,
    });
    setDonations((prev) => [...prev, ...newDonations]);
    setHasMore(newHasMore);
    setIsLoadingMore(false);
  };

  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      donorName: '',
      amount: 0,
      paymentMethod: 'Cash',
      notes: '',
    },
  });

  const handleAddNew = () => {
    form.reset({ donorName: '', amount: 0, date: new Date(), paymentMethod: 'Cash', notes: '' });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: DonationFormValues) => {
    startTransition(async () => {
      const newDonation = await addDonation(userId, data);
      setDonations((prev) => [newDonation, ...prev]);
      toast({ title: 'Donation Added', description: 'The new donation has been recorded.' });
      setIsDialogOpen(false);
    });
  };

  const getFilteredDonations = async () => {
    if (!dateRange?.from) {
      toast({
        variant: 'destructive',
        title: 'Please select a start date.',
      });
      return null;
    }

    const allDonations = await getDonations(userId);
    const from = dateRange.from;
    const to = dateRange.to || dateRange.from;
    const tempTo = new Date(to);
    tempTo.setHours(23, 59, 59, 999);

    return allDonations.filter((donation) => {
      const donationDate = new Date(donation.date);
      return donationDate >= from && donationDate <= tempTo;
    });
  };

  const handleDownloadPdf = async () => {
    const filtered = await getFilteredDonations();
    if (!filtered || !authUser) return;

    if (filtered.length === 0) {
      toast({
        title: 'No Donations Found',
        description: 'There are no donations in the selected date range.',
      });
      return;
    }

    exportDonationsToPdf(filtered, authUser, { from: dateRange!.from!, to: dateRange!.to });
  };

  const handleDownloadXlsx = async () => {
    const filtered = await getFilteredDonations();
    if (!filtered) return;

    if (filtered.length === 0) {
      toast({
        title: 'No Donations Found',
        description: 'There are no donations in the selected date range.',
      });
      return;
    }

    exportDonationsToXlsx(filtered, { from: dateRange!.from!, to: dateRange!.to });
  };

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-2xl">Donations</CardTitle>
            <CardDescription>
              Record and view all donations received. Initial capital is not shown here.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Donation
            </Button>
            <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Download Report
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Download Donations Report</DialogTitle>
                  <DialogDescription>
                    Select a date range to download your donation data.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[calc(100vh-20rem)] overflow-y-auto">
                  <div className="py-4 flex flex-col items-center gap-4">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                    />
                  </div>
                </ScrollArea>
                <DialogFooter className="gap-2 sm:justify-center pt-4 border-t">
                  <Button variant="outline" onClick={handleDownloadPdf} disabled={!dateRange?.from}>
                    <FileText className="mr-2 h-4 w-4" /> Download PDF
                  </Button>
                  <Button variant="outline" onClick={handleDownloadXlsx} disabled={!dateRange?.from}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Excel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DonationsTable donations={donations} isLoading={isInitialLoading} />
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </CardContent>

      <RecordDonationDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        form={form}
        onSubmit={onSubmit}
        isPending={isPending}
      />
    </Card>
  );
}
