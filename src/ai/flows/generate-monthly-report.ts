
// This is an AI-powered report generation flow for monthly bookstore performance.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';


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
    outputSchema: GenerateMonthlyReportOutputSchema,
  },
  async input => {
    const {output} = await reportPrompt(input);

    if (!output) {
      const pdf = new jsPDF();
      pdf.text("The AI model failed to return a valid report structure.", 10, 10);
      return { reportDataUri: pdf.output('datauristring') };
    }
    
    // Generate PDF from the structured AI output
    const doc = new jsPDF();
    const { openingBalances, monthlyActivity, netResult, summary, keyInsights } = output;

    doc.setFontSize(18);
    doc.text(`Monthly Financial Report`, 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`${input.month} ${input.year}`, 105, 28, { align: 'center' });

    // Summary Section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Executive Summary", 14, 45);
    doc.setFont('helvetica', 'normal');
    const splitSummary = doc.splitTextToSize(summary, 180);
    doc.text(splitSummary, 14, 52);
    
    const summaryHeight = (splitSummary.length * 7) + 15;

    // Balances Table
    autoTable(doc, {
      startY: summaryHeight,
      head: [['Opening Balances', 'Amount']],
      body: [
        ['Cash', `$${openingBalances.cash.toFixed(2)}`],
        ['Bank', `$${openingBalances.bank.toFixed(2)}`],
        ['Stock Value', `$${openingBalances.stockValue.toFixed(2)}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: '#306754' },
    });
    
    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // Monthly Activity Table
    autoTable(doc, {
        startY: finalY,
        head: [['Monthly Activity', 'Amount']],
        body: [
            ['Total Sales', `$${monthlyActivity.totalSales.toFixed(2)}`],
            ['Gross Profit', `$${monthlyActivity.grossProfit.toFixed(2)}`],
            ['Total Expenses', `($${monthlyActivity.totalExpenses.toFixed(2)})`],
            ['Total Donations', `$${monthlyActivity.totalDonations.toFixed(2)}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: '#306754' },
    });

    finalY = (doc as any).lastAutoTable.finalY;

    // Net Result
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Net Profit / Loss for the Month:", 14, finalY + 15);
    const netColor = netResult.netProfitOrLoss >= 0 ? '#306754' : '#E53E3E';
    doc.setTextColor(netColor);
    doc.text(`$${netResult.netProfitOrLoss.toFixed(2)}`, 200, finalY + 15, { align: 'right' });
    doc.setTextColor(0); // Reset color
    
    // Key Insights
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Key Insights", 14, finalY + 30);
    doc.setFont('helvetica', 'normal');
    const splitInsights = doc.splitTextToSize(keyInsights.replace(/•/g, '-'), 180); // Replace bullets for better display
    doc.text(splitInsights, 14, finalY + 37);

    return { reportDataUri: doc.output('datauristring') };
  }
);
