
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getBalanceSheetData, getBooks, getDonationsForMonth, getExpensesForMonth, getSalesForMonth } from '@/lib/actions';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import dynamic from 'next/dynamic';

const ReportPreview = dynamic(() => import('./report-preview'), {
  ssr: false,
  loading: () => (
     <div className="max-w-4xl mx-auto animate-pulse">
        <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
        <CardContent className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </CardContent>
    </div>
  ),
});


const reportSchema = z.object({
  month: z.string({ required_error: 'Please select a month.' }),
  year: z.string({ required_error: 'Please select a year.' }),
});

type ReportFormValues = z.infer<typeof reportSchema>;
type ReportData = Awaited<ReturnType<typeof generateReportData>>;

async function generateReportData(year: number, month: number) {
    const [
        salesForMonth, 
        expensesForMonth, 
        donationsForMonth, 
        books, 
        balanceSheet
      ] = await Promise.all([
        getSalesForMonth(year, month),
        getExpensesForMonth(year, month),
        getDonationsForMonth(year, month),
        getBooks(),
        getBalanceSheetData(),
      ]);

      const totalSales = salesForMonth.reduce((sum, sale) => sum + sale.total, 0);
      const grossProfit = salesForMonth.reduce((totalProfit, sale) => {
        const saleProfit = sale.items.reduce((currentSaleProfit, item) => {
          const book = books.find(b => b.id === item.bookId);
          if (book) {
            return currentSaleProfit + (item.price - book.productionPrice) * item.quantity;
          }
          return currentSaleProfit;
        }, 0);
        return totalProfit + saleProfit;
      }, 0);

      const totalExpenses = expensesForMonth.reduce((sum, expense) => sum + expense.amount, 0);
      const totalDonations = donationsForMonth.reduce((sum, donation) => sum + donation.amount, 0);

      return {
          openingBalances: {
            cash: balanceSheet.cash,
            bank: balanceSheet.bank,
            stockValue: balanceSheet.stockValue,
          },
          monthlyActivity: {
            totalSales,
            grossProfit,
            totalExpenses,
            totalDonations,
          },
          netResult: {
            netProfitOrLoss: grossProfit - totalExpenses + totalDonations,
          }
      }
}


export default function ReportGenerator() {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [reportData, setReportData] = React.useState<ReportData | null>(null);
  const [formValues, setFormValues] = React.useState<ReportFormValues | null>(null);

  const { toast } = useToast();

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
  });

  const onSubmit = async (formData: ReportFormValues) => {
    setIsGenerating(true);
    setReportData(null);
    setFormValues(formData);

    try {
      const selectedMonth = parseInt(formData.month, 10);
      const selectedYear = parseInt(formData.year, 10);
      
      const result = await generateReportData(selectedYear, selectedMonth);
      
      if (result) {
        setReportData(result);
        toast({
          title: "Report Generated",
          description: "Your monthly report preview is ready below.",
        });
      } else {
        throw new Error("The report generation failed to return valid data.");
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: `There was a problem generating your report. Error: ${errorMessage}`,
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }));

  const currentYear = new Date().getFullYear();
  const startYear = 2023;
  const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl mx-auto animate-in fade-in-50">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Monthly Report Generator</CardTitle>
          <CardDescription>
            Select a month and year to generate an automated profit-loss report.
            The AI will analyze the data and provide a summary with key metrics.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Month</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a month" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectPortal>
                          <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                          </SelectContent>
                        </SelectPortal>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a year" />
                          </SelectTrigger>
                        </FormControl>
                         <SelectPortal>
                          <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                          </SelectContent>
                        </SelectPortal>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {isGenerating && (
         <Card className="max-w-4xl mx-auto animate-pulse">
            <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </CardContent>
        </Card>
      )}

      {reportData && formValues && (
        <ReportPreview reportData={reportData} month={months[parseInt(formValues.month, 10)].label} year={formValues.year} />
      )}
    </div>
  );
}
