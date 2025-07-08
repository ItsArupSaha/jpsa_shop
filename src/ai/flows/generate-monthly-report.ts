// This is an AI-powered report generation flow for monthly bookstore performance.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { jsPDF } from 'jspdf';


const GenerateMonthlyReportInputSchema = z.object({
  salesData: z.string().describe('Sales data for the month in JSON format.'),
  expensesData: z.string().describe('Expense data for the month in JSON format.'),
  booksData: z.string().describe('The entire book catalog data in JSON format, used to find production prices for profit calculation.'),
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
  output: {schema: z.string().nullable()},
  prompt: `You are an expert financial analyst specializing in creating concise and informative monthly reports for bookstores.

  Given the following data for the month of {{month}} {{year}}, generate a report that includes:

  - Total Sales Revenue
  - Total Cost of Goods Sold (COGS)
  - Gross Profit (Total Sales - COGS)
  - Total Operating Expenses
  - Net Profit/Loss (Gross Profit - Total Operating Expenses)
  - Key Insights (e.g., best-selling book by revenue, best-selling book by quantity, most profitable book, most significant expense category).
  - A brief, professional summary of the month's financial performance.

  To calculate Cost of Goods Sold (COGS), you must look up the 'productionPrice' for each book sold from the booksData and multiply it by the quantity sold.
  The 'price' in the sales data is the selling price.

  Format the report in a way that is easy to read and understand. The report should be structured with clear headings. The report should not be more than 300 words.
  
  If the provided sales and expense data is empty or contains no relevant information, respond with a clear message stating "No data available for the selected period to generate a report.". Do not try to make up any data.

  Sales Data: {{{salesData}}}
  Expense Data: {{{expensesData}}}
  Book Catalog Data: {{{booksData}}}
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
      const pdf = new jsPDF();
      pdf.text("No report could be generated. There might be no data for the selected period.", 10, 10);
      const reportDataUri = pdf.output('datauristring');
      return { reportDataUri };
    }

    // Generate PDF from report summary
    const pdf = new jsPDF();
    const splitText = pdf.splitTextToSize(output, 180);
    pdf.text(splitText, 10, 10);
    const reportDataUri = pdf.output('datauristring');

    return { reportDataUri };
  }
);
