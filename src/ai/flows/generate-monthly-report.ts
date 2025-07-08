// This is an AI-powered report generation flow for monthly bookstore performance.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { jsPDF } from 'jspdf';


const GenerateMonthlyReportInputSchema = z.object({
  salesData: z.string().describe('Sales data for the month in JSON format.'),
  expensesData: z.string().describe('Expense data for the month in JSON format.'),
  month: z.string().describe('The month for which the report is being generated (e.g., January).'),
  year: z.string().describe('The year for which the report is being generated (e.g., 2024).'),
});

export type GenerateMonthlyReportInput = z.infer<typeof GenerateMonthlyReportInputSchema>;

const GenerateMonthlyReportOutputSchema = z.object({
  reportDataUri: z.string().describe('The PDF report as a data URI.'),
});

export type GenerateMonthlyReportOutput = z.infer<typeof GenerateMonthlyReportOutputSchema>;

export async function generateMonthlyReport(input: GenerateMonthlyReportInput): Promise<GenerateMonthlyReportOutput> {
  return generateMonthlyReportFlow(input);
}

const reportPrompt = ai.definePrompt({
  name: 'generateMonthlyReportPrompt',
  input: {schema: GenerateMonthlyReportInputSchema},
  output: {schema: z.string()},
  prompt: `You are an expert financial analyst specializing in creating concise and informative monthly reports for bookstores.

  Given the following sales and expense data for the month of {{month}} {{year}}, generate a report that includes:

  - Total Sales Revenue
  - Total Expenses
  - Net Profit/Loss (Total Sales - Total Expenses)
  - Key Metrics (e.g., best-selling book, most significant expense)
  - A brief summary of the month's performance.

  Format the report in a way that is easy to read and understand.  The report should not be more than 200 words.

  Sales Data: {{{salesData}}}
  Expense Data: {{{expensesData}}}
  `,
});

const generateMonthlyReportFlow = ai.defineFlow(
  {
    name: 'generateMonthlyReportFlow',
    inputSchema: GenerateMonthlyReportInputSchema,
    outputSchema: GenerateMonthlyReportOutputSchema,
  },
  async input => {
    const {output} = await reportPrompt(input);

    if (!output) {
      throw new Error('No report generated.');
    }

    // Generate PDF from report summary
    const pdf = new jsPDF();
    pdf.text(output, 10, 10);
    const reportDataUri = pdf.output('datauristring');

    return { reportDataUri };
  }
);
