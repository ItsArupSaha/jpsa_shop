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

  Given the following data for the month of {{month}} {{year}}, generate a complete report that includes all of the following sections, even if the values are zero:

  - Total Sales Revenue
  - Total Cost of Goods Sold (COGS)
  - Gross Profit (Total Sales - COGS)
  - Total Operating Expenses
  - Net Profit/Loss (Gross Profit - Total Operating Expenses)
  - Key Insights (e.g., best-selling book by revenue, best-selling book by quantity, most profitable book, most significant expense category).
  - A brief, professional summary of the month's financial performance.

  To calculate Cost of Goods Sold (COGS), you must look up the 'productionPrice' for each book sold from the booksData and multiply it by the quantity sold.
  The 'price' in the sales data is the selling price.

  IMPORTANT: If the provided sales or expense data is empty, you must still generate the full report structure and use '0' for the financial values. For "Key Insights", state that no insights can be drawn due to a lack of data for the period. Do not output null or an error message. The report should be structured with clear headings and should not be more than 300 words.
  
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
      pdf.text("No report could be generated. The AI model failed to return a response.", 10, 10);
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
