
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getDonationsForMonth, getExpensesForMonth, getItems, getSalesForMonth, getTransactionsForMonth } from '@/lib/actions';
import { generateMonthlyReport, type ReportAnalysis } from '@/lib/report-generator';
import type { Item } from '@/lib/types';
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
  items: Item[];
}

interface ReportGeneratorProps {
  userId: string;
}

export default function ReportGenerator({ userId }: ReportGeneratorProps) {
  const [dataSource, setDataSource] = React.useState<ReportDataSource | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [reportData, setReportData] = React.useState<ReportAnalysis | null>(null);
  const [formValues, setFormValues] = React.useState<ReportFormValues | null>(null);

  const { toast } = useToast();
  const { authUser } = useAuth();

  React.useEffect(() => {
    async function loadData() {
      if (!userId) return;
      setIsLoading(true);
      try {
        const items = await getItems(userId);
        setDataSource({ items });
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
  }, [userId, toast]);

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

      const [salesForMonth, expensesForMonth, donationsForMonth, transactionsForMonth] = await Promise.all([
        getSalesForMonth(userId, selectedYear, selectedMonth),
        getExpensesForMonth(userId, selectedYear, selectedMonth),
        getDonationsForMonth(userId, selectedYear, selectedMonth),
        getTransactionsForMonth(userId, selectedYear, selectedMonth)
      ]);

      const input = {
        salesData: salesForMonth,
        expensesData: expensesForMonth,
        donationsData: donationsForMonth,
        itemsData: dataSource.items,
        month: new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' }),
        year: formData.year,
        transactionsData: transactionsForMonth,
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

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Get the company creation date
  const companyCreatedAt = authUser?.createdAt ?
    (authUser.createdAt.toDate ? authUser.createdAt.toDate() : new Date(authUser.createdAt)) :
    new Date();
  const companyStartYear = companyCreatedAt.getFullYear();
  const companyStartMonth = companyCreatedAt.getMonth();

  const startYear = Math.min(companyStartYear, currentYear);
  const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => (currentYear - i).toString());

  // Watch the selected year to dynamically generate months
  const selectedYear = form.watch('year');
  const selectedYearNum = selectedYear ? parseInt(selectedYear, 10) : null;

  // Generate months based on selected year, company creation date and current month
  const months = React.useMemo(() => {
    const allMonths = Array.from({ length: 12 }, (_, i) => ({
      value: i.toString(),
      label: new Date(0, i).toLocaleString('default', { month: 'long' }),
    }));

    // If no year is selected yet, show months based on current year logic
    if (!selectedYearNum) {
      // If company was created this year, only show months from creation month to current month
      if (companyStartYear === currentYear) {
        return allMonths.slice(companyStartMonth, currentMonth + 1);
      }
      // If company was created in a previous year, show all months up to current month
      return allMonths.slice(0, currentMonth + 1);
    }

    // If selected year is in the future, show all 12 months
    if (selectedYearNum > currentYear) {
      return allMonths;
    }

    // If selected year is the current year
    if (selectedYearNum === currentYear) {
      // If company was created this year, only show months from creation month to current month
      if (companyStartYear === currentYear) {
        return allMonths.slice(companyStartMonth, currentMonth + 1);
      }
      // If company was created in a previous year, show all months up to current month
      return allMonths.slice(0, currentMonth + 1);
    }

    // If selected year is in the past, show all 12 months
    // But if company was created in that year, only show months from creation month onwards
    if (selectedYearNum === companyStartYear) {
      return allMonths.slice(companyStartMonth);
    }

    // For any other past year, show all 12 months
    return allMonths;
  }, [companyStartYear, companyStartMonth, currentYear, currentMonth, selectedYearNum]);

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl mx-auto animate-in fade-in-50">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Monthly Report Generator</CardTitle>
          <CardDescription>
            Select a month and year to generate an automated profit-loss report.
            Profit is calculated only from paid sales and partial payments received in the selected month.
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
        <ReportPreview
          reportData={reportData}
          month={months[parseInt(formValues.month, 10)]?.label || new Date(0, parseInt(formValues.month, 10)).toLocaleString('default', { month: 'long' })}
          year={formValues.year}
        />
      )}
    </div>
  );
}
