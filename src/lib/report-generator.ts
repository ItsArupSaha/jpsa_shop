
import type { Donation, Expense, Item, Sale, Transaction } from './types';

export interface ReportAnalysis {
  openingBalances: {
    cash: number;
    bank: number;
    stockValue: number;
  };
  monthlyActivity: {
    totalSales: number;
    profitFromPaidSales: number;
    profitFromDuePayments: number;
    receivedPaymentsFromDues: number;
    totalProfit: number;
    totalExpenses: number;
    totalDonations: number;
  };
  netResult: {
    netProfitOrLoss: number;
  };
}

export interface ReportInput {
  salesData: Sale[];
  expensesData: Expense[];
  donationsData: Donation[];
  itemsData: Item[];
  balanceData: {
    cash: number;
    bank: number;
    stockValue: number;
  };
  month: string;
  year: string;
  transactionsData: Transaction[];
}

export function generateMonthlyReport(input: ReportInput): ReportAnalysis {
  const { salesData, expensesData, donationsData, itemsData, balanceData, transactionsData } = input;

  const openingBalances = {
    cash: balanceData.cash,
    bank: balanceData.bank,
    stockValue: balanceData.stockValue,
  };

  const calculateSaleProfit = (sale: Sale): number => {
    const totalProductionCost = sale.items.reduce((acc, saleItem) => {
        const itemData = itemsData.find(i => i.id === saleItem.itemId);
        if (itemData) {
            return acc + (itemData.productionPrice * saleItem.quantity);
        }
        return acc;
    }, 0);
    // The sale.total already accounts for discounts
    return sale.total - totalProductionCost;
  };

  // Profit from sales made and fully/partially paid within this month
  const profitFromPaidSales = salesData
    .filter(sale => sale.paymentMethod === 'Cash' || sale.paymentMethod === 'Bank' || sale.paymentMethod === 'Split')
    .reduce((totalProfit, sale) => {
      const totalSaleProfit = calculateSaleProfit(sale);
      if (sale.paymentMethod === 'Split' && sale.amountPaid && sale.total > 0) {
        // Prorate profit for split payments
        const paymentRatio = sale.amountPaid / sale.total;
        return totalProfit + (totalSaleProfit * paymentRatio);
      }
      // For Cash/Bank, the whole profit is realized
      return totalProfit + totalSaleProfit;
    }, 0);

  // Profit recognized from payments received THIS month for sales made previously
  // Exclude initial partial payment transactions from split sales made in the same month
  // (these are counted in profitFromPaidSales, not here)
  const profitFromDuePayments = transactionsData
    .filter(t => t.type === 'Receivable' && t.status === 'Paid')
    .filter(t => {
      // Skip if this is an initial partial payment from a split sale
      // (these have saleId and description starting with "Partial payment")
      if (t.saleId && t.description?.startsWith('Partial payment')) {
        return false;
      }
      return true;
    })
    .reduce((sum, t) => sum + (t.recognizedProfit || 0), 0);

  const totalSales = salesData.reduce((sum, sale) => sum + sale.total, 0);

  const receivedPaymentsFromDues = transactionsData
    .filter(t => t.type === 'Receivable' && t.status === 'Paid' && t.description?.startsWith('Payment from customer'))
    .reduce((total, payment) => total + payment.amount, 0);

  const totalExpenses = expensesData.reduce((sum, expense) => sum + expense.amount, 0);
  const totalDonations = donationsData.reduce((sum, donation) => sum + donation.amount, 0);

  const totalProfit = profitFromPaidSales + profitFromDuePayments;

  const monthlyActivity = {
    totalSales,
    profitFromPaidSales,
    profitFromDuePayments,
    receivedPaymentsFromDues,
    totalProfit,
    totalExpenses,
    totalDonations,
  };

  const netProfitOrLoss = totalProfit - totalExpenses;

  const netResult = {
    netProfitOrLoss,
  };

  return {
    openingBalances,
    monthlyActivity,
    netResult,
  };
}
