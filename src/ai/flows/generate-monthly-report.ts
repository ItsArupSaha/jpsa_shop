
// This is an AI-powered report generation flow for monthly bookstore performance.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateMonthlyReportInputSchema = z.object({
  salesData: z.string().describe('Sales data for the month in JSON format.'),
  expensesData: z.string().describe('Expense data for the month in JSON format.'),
  donationsData: z.string().describe('Donation data for the month in JSON format.'),
  booksData: z.string().describe('The entire book catalog data in JSON format, used to find production prices for profit calculation and total stock value.'),
  balanceData: z.string().describe('JSON object containing the current cash, bank, and total stock value balances.'),
  month: z.string().describe('The month for which the report is being generated (e.g., January).'),
  year: z.string().describe('The year for which the report is being generated (e.g., 2024).'),
});

export type GenerateMonthlyReportInput = z.infer<typeof GenerateMonthlyReportInputSchema>;

const ReportAnalysisSchema = z.object({
    openingBalances: z.object({
        cash: z.number().describe('The starting cash balance.'),
        bank: z.number().describe('The starting bank balance.'),
        stockValue: z.number().describe('The total value of all book stock.'),
    }),
    monthlyActivity: z.object({
        totalSales: z.number().describe('The total sales revenue for the month.'),
        grossProfit: z.number().describe('The gross profit from sales (Total Sales - Cost of Goods Sold).'),
        totalExpenses: z.number().describe('The total expenses for the month.'),
        totalDonations: z.number().describe('The total donations received during the month.'),
    }),
    netResult: z.object({
        netProfitOrLoss: z.number().describe('The net profit or loss for the month (Gross Profit - Total Expenses + Total Donations).'),
    }),
    summary: z.string().describe("A brief, professional summary of the month's financial performance, highlighting key factors."),
    keyInsights: z.string().describe("Bulleted list of key insights (e.g., best-selling book by revenue, most significant expense category, impact of donations).")
});
export type ReportAnalysis = z.infer<typeof ReportAnalysisSchema>;


export async function generateMonthlyReport(input: GenerateMonthlyReportInput): Promise<ReportAnalysis | null> {
  return generateMonthlyReportFlow(input);
}

const reportPrompt = ai.definePrompt({
  name: 'generateMonthlyReportPrompt',
  input: {schema: GenerateMonthlyReportInputSchema},
  output: {schema: ReportAnalysisSchema},
  prompt: `You are an expert financial analyst for a bookstore. Your task is to generate a comprehensive but easy-to-understand monthly financial report for {{month}} {{year}}.

  **Instructions:**
  1.  **Analyze all provided data:** Use the sales, expenses, donations, book catalog, and current balance data.
  2.  **Calculate all required fields:** You must calculate every field in the output schema.
  3.  **Calculate Gross Profit:** To get Gross Profit, you first need to calculate Cost of Goods Sold (COGS). For each book sold, find its 'productionPrice' in the booksData and multiply by quantity. Sum this up for all sales to get total COGS. Then, Gross Profit = Total Sales Revenue - COGS.
  4.  **Calculate Net Profit/Loss:** The final calculation is: Net Profit/Loss = Gross Profit - Total Expenses + Total Donations.
  5.  **Handle Zero Data:** If there is no sales, expense, or donation data for the month, you must still generate the full report structure. Use '0' for the financial values in 'monthlyActivity' and 'netResult'.
  6.  **Provide Insights:** Based on the data, generate a short summary and a few bullet points for key insights. If there's no data, state that no insights can be drawn.

  **Data:**
  - Book Catalog: {{{booksData}}}
  - Balance Data (Cash, Bank, Stock Value): {{{balanceData}}}
  - Sales for {{month}}: {{{salesData}}}
  - Expenses for {{month}}: {{{expensesData}}}
  - Donations for {{month}}: {{{donationsData}}}
  `,
});

const generateMonthlyReportFlow = ai.defineFlow(
  {
    name: 'generateMonthlyReportFlow',
    inputSchema: GenerateMonthlyReportInputSchema,
    outputSchema: ReportAnalysisSchema,
  },
  async input => {
    const {output} = await reportPrompt(input);
    
    if (!output) {
      console.error("The AI model failed to return a valid report structure.");
      return null;
    }

    return output;
  }
);
