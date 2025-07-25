
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { addDonation, getDonationsPaginated } from '@/lib/actions';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import type { DateRange } from 'react-day-picker';

import type { Donation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const donationSchema = z.object({
  donorName: z.string().min(1, 'Donor name is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  date: z.date({ required_error: "A donation date is required." }),
  paymentMethod: z.enum(['Cash', 'Bank'], { required_error: "A payment method is required." }),
  notes: z.string().optional(),
});

type DonationFormValues = z.infer<typeof donationSchema>;

export default function DonationsManagement() {
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
    const { donations: newDonations, hasMore: newHasMore } = await getDonationsPaginated({ pageLimit: 5 });
    setDonations(newDonations);
    setHasMore(newHasMore);
    setIsInitialLoading(false);
  }, []);

  React.useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastDonationId = donations[donations.length - 1]?.id;
    const { donations: newDonations, hasMore: newHasMore } = await getDonationsPaginated({ pageLimit: 5, lastVisibleId: lastDonationId });
    setDonations(prev => [...prev, ...newDonations]);
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
        const newDonation = await addDonation(data);
        setDonations(prev => [newDonation, ...prev]);
        toast({ title: 'Donation Added', description: 'The new donation has been recorded.' });
        setIsDialogOpen(false);
    });
  };

  const getFilteredDonations = () => {
    if (!dateRange?.from) {
        toast({
            variant: "destructive",
            title: "Please select a start date.",
        });
        return null;
    }
    
    const from = dateRange.from;
    const to = dateRange.to || dateRange.from;
    to.setHours(23, 59, 59, 999);

    return donations.filter(donation => {
      const donationDate = new Date(donation.date);
      return donationDate >= from && donationDate <= to;
    });
  }

  const handleDownloadPdf = () => {
    const filteredDonations = getFilteredDonations();
    if (!filteredDonations) return;

    if (filteredDonations.length === 0) {
      toast({ title: 'No Donations Found', description: 'There are no donations in the selected date range.' });
      return;
    }

    const doc = new jsPDF();
    const dateString = `${format(dateRange!.from!, 'PPP')} - ${format(dateRange!.to! || dateRange!.from!, 'PPP')}`;
    const totalDonations = filteredDonations.reduce((sum, d) => sum + d.amount, 0);

    doc.text(`Donations Report: ${dateString}`, 14, 15);
    
    autoTable(doc, {
      startY: 20,
      head: [['Date', 'Donor', 'Method', 'Notes', 'Amount']],
      body: filteredDonations.map(d => [
        format(new Date(d.date), 'yyyy-MM-dd'),
        d.donorName,
        d.paymentMethod,
        d.notes || '',
        `$${d.amount.toFixed(2)}`
      ]),
      foot: [
        [{ content: 'Total', colSpan: 4, styles: { halign: 'right' } }, `$${totalDonations.toFixed(2)}`],
      ],
      footStyles: { fontStyle: 'bold', fillColor: [240, 240, 240] },
    });
    
    doc.save(`donations-report-${format(dateRange!.from!, 'yyyy-MM-dd')}-to-${format(dateRange!.to! || dateRange!.from!, 'yyyy-MM-dd')}.pdf`);
  };

  const handleDownloadCsv = () => {
    const filteredDonations = getFilteredDonations();
    if (!filteredDonations) return;

    if (filteredDonations.length === 0) {
      toast({ title: 'No Donations Found', description: 'There are no donations in the selected date range.' });
      return;
    }

    const csvData = filteredDonations.map(d => ({
      Date: format(new Date(d.date), 'yyyy-MM-dd'),
      'Donor Name': d.donorName,
      'Payment Method': d.paymentMethod,
      Amount: d.amount.toFixed(2),
      Notes: d.notes || '',
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `donations-report-${format(dateRange!.from!, 'yyyy-MM-dd')}-to-${format(dateRange!.to! || dateRange!.from!, 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-2xl">Donations</CardTitle>
            <CardDescription>Record and view all donations received.</CardDescription>
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
                        <DialogDescription>Select a date range to download your donation data.</DialogDescription>
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
                      <Button variant="outline" onClick={handleDownloadPdf} disabled={!dateRange?.from}><FileText className="mr-2 h-4 w-4" /> Download PDF</Button>
                      <Button variant="outline" onClick={handleDownloadCsv} disabled={!dateRange?.from}><FileSpreadsheet className="mr-2 h-4 w-4" /> Download CSV</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {isInitialLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-2/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-1/4 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : donations.length > 0 ? donations.map((donation) => (
                <TableRow key={donation.id}>
                  <TableCell>{format(new Date(donation.date), 'PPP')}</TableCell>
                  <TableCell className="font-medium">{donation.donorName}</TableCell>
                  <TableCell>{donation.notes}</TableCell>
                  <TableCell>{donation.paymentMethod}</TableCell>
                  <TableCell className="text-right">${donation.amount.toFixed(2)}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No donations recorded yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading...</> : 'Load More'}
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-headline">Record a Donation</DialogTitle>
            <DialogDescription>Enter the details for the donation received.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
               <div className="flex-1 overflow-y-auto pr-4 pl-1 -mr-4 -ml-1">
                <div className="space-y-4 py-4 px-4">
                  <FormField
                    control={form.control}
                    name="donorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Donor Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Jane Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="100.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Payment Method</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex gap-4"
                          >
                            <FormItem className="flex items-center space-x-2">
                              <FormControl><RadioGroupItem value="Cash" /></FormControl>
                              <FormLabel className="font-normal">Cash</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2">
                              <FormControl><RadioGroupItem value="Bank" /></FormControl>
                              <FormLabel className="font-normal">Bank</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Donation Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="e.g., For new childrens books" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
              </div>
              <DialogFooter className="pt-4 border-t">
                <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save Donation"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

    