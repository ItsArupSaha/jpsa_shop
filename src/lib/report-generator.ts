import type { Book, Donation, Expense, Sale } from './types';

export interface ReportAnalysis {
  openingBalances: {
    cash: number;
    bank: number;
    stockValue: number;
  };
  monthlyActivity: {
    totalSales: number;
    grossProfit: number;
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
  booksData: Book[];
  balanceData: {
    cash: number;
    bank: number;
    stockValue: number;
  };
  month: string;
  year: string;
}

export function generateMonthlyReport(input: ReportInput): ReportAnalysis {
  const { salesData, expensesData, donationsData, booksData, balanceData } = input;

  // Calculate opening balances
  const openingBalances = {
    cash: balanceData.cash,
    bank: balanceData.bank,
    stockValue: balanceData.stockValue,
  };

  // Calculate monthly activity
  const totalSales = salesData.reduce((sum, sale) => sum + sale.total, 0);
  
  // Calculate gross profit (Total Sales - Cost of Goods Sold)
  const grossProfit = salesData.reduce((totalProfit, sale) => {
    const saleProfit = sale.items.reduce((currentSaleProfit, item) => {
      const book = booksData.find(b => b.id === item.bookId);
      if (book) {
        const itemProfit = (item.price - book.productionPrice) * item.quantity;
        return currentSaleProfit + itemProfit;
      }
      return currentSaleProfit;
    }, 0);
    return totalProfit + saleProfit;
  }, 0);

  const totalExpenses = expensesData.reduce((sum, expense) => sum + expense.amount, 0);
  const totalDonations = donationsData.reduce((sum, donation) => sum + donation.amount, 0);

  const monthlyActivity = {
    totalSales,
    grossProfit,
    totalExpenses,
    totalDonations,
  };

  // Calculate net result
  const netProfitOrLoss = grossProfit - totalExpenses + totalDonations;

  const netResult = {
    netProfitOrLoss,
  };

  return {
    openingBalances,
    monthlyActivity,
    netResult,
  };
} 