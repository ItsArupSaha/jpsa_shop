

'use server';

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
