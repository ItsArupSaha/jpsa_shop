'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { generateMonthlyReport } from '@/ai/flows/generate-monthly-report';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download } from 'lucide-react';
import type { Sale, Expense } from '@/lib/types';

const reportSchema = z.object({
  month: z.string({ required_error: 'Please select a month.' }),
  year: z.string({ required_error: 'Please select a year.' }),
});

type ReportFormValues = z.infer<typeof reportSchema>;

interface ReportGeneratorProps {
  mockData: {
    sales: Sale[];
    expenses: Expense[];
  }
}

export default function ReportGenerator({ mockData }: ReportGeneratorProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [reportUri, setReportUri] = React.useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
  });

  const onSubmit = async (data: ReportFormValues) => {
    setIsLoading(true);
    setReportUri(null);
    try {
      const selectedMonth = parseInt(data.month, 10);
      const selectedYear = parseInt(data.year, 10);
      
      const salesForMonth = mockData.sales.filter(s => {
        const saleDate = new Date(s.date);
        return saleDate.getMonth() === selectedMonth && saleDate.getFullYear() === selectedYear;
      });

      const expensesForMonth = mockData.expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === selectedYear;
      });
      
      const input = {
        salesData: JSON.stringify(salesForMonth),
        expensesData: JSON.stringify(expensesForMonth),
        month: new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' }),
        year: data.year,
      };

      const result = await generateMonthlyReport(input);
      setReportUri(result.reportDataUri);
      toast({
        title: "Report Generated",
        description: "Your monthly report is ready for download.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem generating your report. Please check the console for details.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }));

  const years = ['2024', '2023'];

  return (
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
                      <SelectContent>
                        {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
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
                      <SelectContent>
                        {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Report
            </Button>
            {reportUri && (
              <Button asChild variant="outline">
                <a href={reportUri} download={`report-${months[parseInt(form.getValues('month'))].label}-${form.getValues('year')}.pdf`}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </a>
              </Button>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
