
import type { Item, Donation, Expense, Sale } from './types';

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
  itemsData: Item[];
  balanceData: {
    cash: number;
    bank: number;
    stockValue: number;
  };
  month: string;
  year: string;
}

export function generateMonthlyReport(input: ReportInput): ReportAnalysis {
  const { salesData, expensesData, donationsData, itemsData, balanceData } = input;

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
    const saleProfit = sale.items.reduce((currentSaleProfit, saleItem) => {
      const item = itemsData.find(b => b.id === saleItem.itemId);
      if (item) {
        const itemProfit = (saleItem.price - item.productionPrice) * saleItem.quantity;
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
