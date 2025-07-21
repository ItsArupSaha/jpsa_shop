
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getBalanceSheetData, getBooks, getDonationsForMonth, getExpensesForMonth, getSalesForMonth } from '@/lib/actions';
import { generateMonthlyReport, type ReportAnalysis } from '@/lib/report-generator';
import type { Book } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import ReportPreview from './report-preview';

const reportSchema = z.object({
  month: z.string({ required_error: 'Please select a month.' }),
  year: z.string({ required_error: 'Please select a year.' }),
});

type ReportFormValues = z.infer<typeof reportSchema>;

interface ReportDataSource {
  books: Book[];
  balanceSheet: Awaited<ReturnType<typeof getBalanceSheetData>>;
}

export default function ReportGenerator() {
  const [dataSource, setDataSource] = React.useState<ReportDataSource | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [reportData, setReportData] = React.useState<ReportAnalysis | null>(null);
  const [formValues, setFormValues] = React.useState<ReportFormValues | null>(null);

  const { toast } = useToast();

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [books, balanceSheet] = await Promise.all([
          getBooks(),
          getBalanceSheetData(),
        ]);
        setDataSource({ books, balanceSheet });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to load data",
          description: "Could not fetch the necessary data for reports. Please try again later.",
        });
        console.error("Failed to load report data sources:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
  });

  const onSubmit = async (formData: ReportFormValues) => {
    if (!dataSource) return;
    
    setIsGenerating(true);
    setReportData(null);
    setFormValues(formData);

    try {
      const selectedMonth = parseInt(formData.month, 10);
      const selectedYear = parseInt(formData.year, 10);
      
      const [salesForMonth, expensesForMonth, donationsForMonth] = await Promise.all([
        getSalesForMonth(selectedYear, selectedMonth),
        getExpensesForMonth(selectedYear, selectedMonth),
        getDonationsForMonth(selectedYear, selectedMonth)
      ]);
      
      const input = {
        salesData: salesForMonth,
        expensesData: expensesForMonth,
        donationsData: donationsForMonth,
        booksData: dataSource.books,
        balanceData: {
            cash: dataSource.balanceSheet.cash,
            bank: dataSource.balanceSheet.bank,
            stockValue: dataSource.balanceSheet.stockValue,
        },
        month: new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' }),
        year: formData.year,
      };

      const result = generateMonthlyReport(input);
      
      if (result) {
        setReportData(result);
        toast({
          title: "Report Generated",
          description: "Your monthly report preview is ready below.",
        });
      } else {
        throw new Error("The AI model failed to return valid report data.");
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
            <CardContent className="space-y-4">
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
            <CardFooter className="flex justify-start">
              <Button type="submit" disabled={isLoading || isGenerating}>
                {(isLoading || isGenerating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Loading Data...' : isGenerating ? 'Generating...' : 'Generate Report'}
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
