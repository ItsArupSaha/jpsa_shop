
import type { Donation, Expense, Item, Sale, Transaction } from './types';

export interface ReportAnalysis {
  monthlyActivity: {
    totalSales: number;
    profitFromPaidSales: number;
    profitFromDuePayments: number;
    receivedPaymentsFromDues: number;
    totalProfit: number;
    totalExpenses: number;
    totalDonations: number;
  };
  salesBreakdown: {
    paid: number;
    due: number;
  };
  cashFlow: {
    sales: { cash: number; bank: number };
    duePayments: { cash: number; bank: number };
    donations: { cash: number; bank: number };
    expenses: { cash: number; bank: number };
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
  month: string;
  year: string;
  transactionsData: Transaction[];
}

export function generateMonthlyReport(input: ReportInput): ReportAnalysis {
  const { salesData, expensesData, donationsData, itemsData, transactionsData } = input;

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

  // Calculate paid vs due sales breakdown
  const salesBreakdown = salesData.reduce(
    (acc, sale) => {
      if (sale.paymentMethod === 'Cash' || sale.paymentMethod === 'Bank' || sale.paymentMethod === 'Paid by Credit') {
        // Fully paid sales
        acc.paid += sale.total;
      } else if (sale.paymentMethod === 'Split' && sale.amountPaid && sale.total > 0) {
        // Split payment: amountPaid is paid, rest is due
        acc.paid += sale.amountPaid;
        acc.due += sale.total - sale.amountPaid;
      } else if (sale.paymentMethod === 'Due') {
        // Fully due sales
        acc.due += sale.total;
      }
      return acc;
    },
    { paid: 0, due: 0 }
  );

  // Cash/bank breakdown for sales based on payment method
  const salesCashBank = salesData.reduce(
    (acc, sale) => {
      if (sale.paymentMethod === 'Cash') {
        acc.cash += sale.total;
      } else if (sale.paymentMethod === 'Bank') {
        acc.bank += sale.total;
      } else if (sale.paymentMethod === 'Split' && sale.amountPaid && sale.amountPaid > 0 && sale.splitPaymentMethod) {
        // Only the immediate paid portion counts towards cash/bank; the rest is due
        if (sale.splitPaymentMethod === 'Cash') {
          acc.cash += sale.amountPaid;
        } else if (sale.splitPaymentMethod === 'Bank') {
          acc.bank += sale.amountPaid;
        }
      }
      // 'Due' and 'Paid by Credit' do not contribute to cash/bank directly
      return acc;
    },
    { cash: 0, bank: 0 }
  );

  const duePayments = transactionsData
    .filter(t => t.type === 'Receivable' && t.status === 'Paid' && t.description?.startsWith('Payment from customer'));

  const receivedPaymentsFromDues = duePayments
    .reduce((total, payment) => total + payment.amount, 0);

  const duePaymentsCashBank = duePayments.reduce(
    (acc, t) => {
      if (t.paymentMethod === 'Cash') {
        acc.cash += t.amount;
      } else if (t.paymentMethod === 'Bank') {
        acc.bank += t.amount;
      }
      return acc;
    },
    { cash: 0, bank: 0 }
  );

  const totalExpenses = expensesData.reduce((sum, expense) => sum + expense.amount, 0);
  const expensesCashBank = expensesData.reduce(
    (acc, expense) => {
      if (expense.paymentMethod === 'Cash') {
        acc.cash += expense.amount;
      } else if (expense.paymentMethod === 'Bank') {
        acc.bank += expense.amount;
      }
      return acc;
    },
    { cash: 0, bank: 0 }
  );

  const totalDonations = donationsData.reduce((sum, donation) => sum + donation.amount, 0);
  const donationsCashBank = donationsData.reduce(
    (acc, donation) => {
      if (donation.paymentMethod === 'Cash') {
        acc.cash += donation.amount;
      } else if (donation.paymentMethod === 'Bank') {
        acc.bank += donation.amount;
      }
      return acc;
    },
    { cash: 0, bank: 0 }
  );

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

  const cashFlow = {
    sales: salesCashBank,
    duePayments: duePaymentsCashBank,
    donations: donationsCashBank,
    expenses: expensesCashBank,
  };

  // Net result: Profit + Donations - Expenses
  const netProfitOrLoss = totalProfit + totalDonations - totalExpenses;

  const netResult = {
    netProfitOrLoss,
  };

  return {
    monthlyActivity,
    salesBreakdown,
    cashFlow,
    netResult,
  };
}
