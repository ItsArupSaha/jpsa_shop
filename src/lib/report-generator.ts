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

  const calculateSaleProfit = (sale: Sale): number => {
    let totalSaleProfit = 0;

    // Distribute sale-level discount proportionally across items
    for (const item of sale.items) {
      const itemData = itemsData.find(i => i.id === item.itemId);
      if (itemData) {
        const itemSubtotal = item.price * item.quantity;
        // Calculate the item's share of the discount
        const discountRatio = sale.subtotal > 0 ? itemSubtotal / sale.subtotal : 0;
        const itemDiscount = (sale.subtotal - sale.total) * discountRatio;
        
        // Calculate the actual price the customer paid for these items
        const actualItemRevenue = itemSubtotal - itemDiscount;

        // Calculate profit for this line item
        const itemCost = itemData.productionPrice * item.quantity;
        const itemProfit = actualItemRevenue - itemCost;
        
        totalSaleProfit += itemProfit;
      }
    }
    return totalSaleProfit;
  };

  // Calculate profit from fully paid sales in this month
  const profitFromPaidSales = salesData
    .filter(sale => sale.paymentMethod !== 'Due')
    .reduce((totalProfit, sale) => {
        return totalProfit + calculateSaleProfit(sale);
    }, 0);


  // Calculate profit from partial payments received in this month
  // This is complex as we need to find the original sale for the payment
  const profitFromPartialPayments = transactionsData
    .filter(transaction => 
      transaction.type === 'Receivable' && 
      transaction.status === 'Paid' &&
      transaction.saleId // Ensure it's linked to a sale
    )
    .reduce((totalProfit, payment) => {
      const originalSale = salesData.find(s => s.saleId === payment.saleId);
      
      if (originalSale) {
        const saleProfit = calculateSaleProfit(originalSale);
        const originalDueAmount = originalSale.total - (originalSale.amountPaid || 0);

        if (originalDueAmount > 0) {
            // Prorate the profit based on how much of the due amount was paid
            const paymentRatio = payment.amount / originalDueAmount;
            return totalProfit + (saleProfit * paymentRatio);
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
