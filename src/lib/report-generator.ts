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
    profitFromPartialPayments: number;
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
  // New: We need transactions data to track partial payments
  transactionsData: Transaction[];
}

export function generateMonthlyReport(input: ReportInput): ReportAnalysis {
  const { salesData, expensesData, donationsData, itemsData, balanceData, transactionsData } = input;

  // Calculate opening balances
  const openingBalances = {
    cash: balanceData.cash,
    bank: balanceData.bank,
    stockValue: balanceData.stockValue,
  };

  // Calculate profit from fully paid sales in this month
  const profitFromPaidSales = salesData
    .filter(sale => sale.paymentMethod !== 'Due') // Exclude due sales
    .reduce((totalProfit, sale) => {
      const saleProfit = sale.items.reduce((currentSaleProfit, item) => {
        const itemData = itemsData.find(i => i.id === item.itemId);
        if (itemData) {
          const itemProfit = (item.price - itemData.productionPrice) * item.quantity;
          return currentSaleProfit + itemProfit;
        }
        return currentSaleProfit;
      }, 0);
      return totalProfit + saleProfit;
    }, 0);

  // Calculate profit from partial payments received in this month
  const profitFromPartialPayments = transactionsData
    .filter(transaction => 
      transaction.type === 'Receivable' && 
      transaction.status === 'Paid' &&
      transaction.description.startsWith('Payment from customer')
    )
    .reduce((totalProfit, payment) => {
      // Find the original sale this payment is settling
      // We need to match this payment to the receivable it settled
      const settledReceivable = transactionsData.find(t => 
        t.type === 'Receivable' && 
        t.status === 'Paid' && 
        t.customerId === payment.customerId &&
        t.description.startsWith('Due from Sale')
      );
      
      if (settledReceivable) {
        // Extract sale ID from description like "Due from SALE-0001"
        const saleIdMatch = settledReceivable.description.match(/Due from (SALE-\d+)/);
        if (saleIdMatch) {
          const saleId = saleIdMatch[1];
          const originalSale = salesData.find(s => s.saleId === saleId);
          
          if (originalSale) {
            // Calculate profit for the settled amount
            const settlementRatio = payment.amount / settledReceivable.amount;
            const saleProfit = originalSale.items.reduce((currentSaleProfit, item) => {
              const itemData = itemsData.find(i => i.id === item.itemId);
              if (itemData) {
                const itemProfit = (item.price - itemData.productionPrice) * item.quantity;
                return currentSaleProfit + (itemProfit * settlementRatio);
              }
              return currentSaleProfit;
            }, 0);
            return totalProfit + saleProfit;
          }
        }
      }
      return totalProfit;
    }, 0);

  // Calculate total sales (only paid sales for this month)
  const totalSales = salesData
    .filter(sale => sale.paymentMethod !== 'Due')
    .reduce((sum, sale) => sum + sale.total, 0);

  // Calculate received payments from outstanding dues in this month
  const receivedPaymentsFromDues = transactionsData
    .filter(transaction => 
      transaction.type === 'Receivable' && 
      transaction.status === 'Paid' &&
      transaction.description.startsWith('Payment from customer')
    )
    .reduce((total, payment) => total + payment.amount, 0);

  const totalExpenses = expensesData.reduce((sum, expense) => sum + expense.amount, 0);
  const totalDonations = donationsData.reduce((sum, donation) => sum + donation.amount, 0);

  // Total profit for the month
  const totalProfit = profitFromPaidSales + profitFromPartialPayments;

  const monthlyActivity = {
    totalSales,
    profitFromPaidSales,
    profitFromPartialPayments,
    receivedPaymentsFromDues,
    totalProfit,
    totalExpenses,
    totalDonations,
  };

  // Calculate net result
  const netProfitOrLoss = totalProfit - totalExpenses + totalDonations;

  const netResult = {
    netProfitOrLoss,
  };

  return {
    openingBalances,
    monthlyActivity,
    netResult,
  };
} 