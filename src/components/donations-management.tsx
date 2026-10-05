'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { DateRange } from 'react-day-picker';
import { Download, FileSpreadsheet, FileText, PlusCircle, Search, X } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import { addDonation, getDonations } from '@/lib/actions';
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

const PAGE_SIZE = 10;

export default function DonationsManagement({ userId }: DonationsManagementProps) {
  const { authUser } = useAuth();
  const [allDonations, setAllDonations] = React.useState<Donation[]>([]);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const loadInitialData = React.useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const donationsData = await getDonations(userId);
      setAllDonations(donationsData);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load donations.' });
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId, toast]);

  React.useEffect(() => {
    if (userId) {
      loadInitialData();
    }
  }, [userId, loadInitialData]);

  const filteredDonations = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allDonations;
    return allDonations.filter(d =>
      (d.donationId || '').toLowerCase().includes(q) ||
      d.donorName.toLowerCase().includes(q) ||
      (d.notes || '').toLowerCase().includes(q)
    );
  }, [allDonations, searchQuery]);

  const visibleDonations = React.useMemo(
    () => filteredDonations.slice(0, visibleCount),
    [filteredDonations, visibleCount]
  );
  const hasMore = visibleCount < filteredDonations.length;

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
      try {
        const newDonation = await addDonation(userId, data);
        setAllDonations((prev) => [newDonation, ...prev]);
        toast({ title: 'Donation Added', description: 'The new donation has been recorded.' });
        setIsDialogOpen(false);
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to record the donation.' });
      }
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
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div>
            <CardTitle className="font-headline text-2xl">Donations</CardTitle>
            <CardDescription>
              Record and view all donations received. Initial capital is not shown here.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Donation
            </Button>
            <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Export
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
                    <FileText className="mr-2 h-4 w-4" /> PDF
                  </Button>
                  <Button variant="outline" onClick={handleDownloadXlsx} disabled={!dateRange?.from}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search donations by donor or ID..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Clear search"
                className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearchQuery('');
                  setVisibleCount(PAGE_SIZE);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground md:py-2">{filteredDonations.length} donation(s)</p>
        </div>

        <DonationsTable donations={visibleDonations} isLoading={isInitialLoading} />
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
              Load More
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
