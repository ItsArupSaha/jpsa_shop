
import { toBusinessYMD } from './db/business-date';
import type { Donation, Expense, Item, Sale, Transaction } from './types';

export interface ReportAnalysis {
  monthlyActivity: {
    totalSales: number;
    profitFromPaidSales: number;
    profitFromDuePayments: number;
    receivedPaymentsFromDues: number;
    /** Portion of the month's due payments that settled dues created in a previous month. */
    recoveredFromPriorDues: number;
    /** Portion of the month's due payments that settled dues created in the same month. */
    sameMonthDueSettlements: number;
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
  /** 0-based month index and numeric year of the report period (Bangladesh calendar). */
  monthIndex: number;
  yearNumber: number;
  transactionsData: Transaction[];
  /** Every sale ever, used to rebuild each customer's due history for the settlement replay. */
  allSalesData: Sale[];
  /** Every receivable transaction ever (original dues + payments) for the same replay. */
  allReceivablesData: Transaction[];
}

interface DueEntry {
  // Bangladesh calendar day (`yyyy-MM-dd`) the due was created
  createdYMD: string;
  remaining: number;
}

/**
 * Split the month's "Payment from customer" collections into:
 *  - sameMonth: dues created and settled within the same Bangladesh month
 *    (ordinary invoice terms, not chased dues)
 *  - priorMonths: recoveries of dues outstanding from before that month
 *
 * addPayment() settles a customer's pending receivables FIFO (oldest first)
 * and does not record the linkage on the payment transaction, so the split is
 * rebuilt by replaying every customer's payments chronologically against
 * their due queue. Sale dues are rebuilt from the sale records (the source of
 * truth — the receivable docs are decremented/hidden in place as they
 * settle); manually added receivables contribute their stored amount, which
 * underestimates partially settled ones. Any payment amount beyond the
 * queued dues (data drift, e.g. a deleted sale) is counted as a prior-month
 * recovery so the two buckets always sum to the reported total.
 */
function classifyDuePayments(
  reportYm: string,
  allSales: Sale[],
  allReceivables: Transaction[],
): { sameMonth: number; priorMonths: number } {
  const duesByCustomer = new Map<string, DueEntry[]>();
  const addDue = (customerId: string, createdYMD: string, amount: number) => {
    if (!customerId || amount <= 0) return;
    const queue = duesByCustomer.get(customerId);
    if (queue) {
      queue.push({ createdYMD, remaining: amount });
    } else {
      duesByCustomer.set(customerId, [{ createdYMD, remaining: amount }]);
    }
  };

  for (const sale of allSales) {
    if (sale.paymentMethod === 'Due' || sale.paymentMethod === 'Split') {
      const dueAmount = sale.paymentMethod === 'Due'
        ? sale.total
        : sale.total - (sale.amountPaid || 0);
      const day = toBusinessYMD(sale.date);
      if (day) addDue(sale.customerId, day, dueAmount);
    }
  }

  // Manual receivables only — sale-linked originals are covered above by the
  // sale records, so including them here would double-count.
  for (const t of allReceivables) {
    if (!t.paymentMethod && !t.saleId) {
      const day = toBusinessYMD(t.dueDate);
      if (day) addDue(t.customerId || '', day, Number(t.amount) || 0);
    }
  }

  const paymentsByCustomer = new Map<string, Transaction[]>();
  for (const t of allReceivables) {
    if (t.type === 'Receivable' && t.status === 'Paid' && t.description?.startsWith('Payment from customer')) {
      const list = paymentsByCustomer.get(t.customerId || '');
      if (list) {
        list.push(t);
      } else {
        paymentsByCustomer.set(t.customerId || '', [t]);
      }
    }
  }

  let sameMonth = 0;
  let priorMonths = 0;

  for (const [customerId, payments] of paymentsByCustomer) {
    const dues = (duesByCustomer.get(customerId) || [])
      .sort((a, b) => a.createdYMD.localeCompare(b.createdYMD));
    const chronological = [...payments].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    // Receivables become settleable only once created (FIFO, oldest first),
    // mirroring the query order addPayment() uses.
    let settleable = 0;
    for (const payment of chronological) {
      const paymentDay = toBusinessYMD(payment.dueDate);
      if (!paymentDay) continue;
      while (settleable < dues.length && dues[settleable].createdYMD <= paymentDay) {
        settleable++;
      }

      let amount = Number(payment.amount) || 0;
      let settledSameMonth = 0;
      for (let i = 0; i < settleable && amount > 0; i++) {
        const due = dues[i];
        const settled = Math.min(amount, due.remaining);
        due.remaining -= settled;
        amount -= settled;
        if (due.createdYMD.slice(0, 7) === paymentDay.slice(0, 7)) {
          settledSameMonth += settled;
        }
      }

      if (paymentDay.slice(0, 7) === reportYm) {
        sameMonth += settledSameMonth;
        priorMonths += (Number(payment.amount) || 0) - settledSameMonth;
      }
    }
  }

  return { sameMonth, priorMonths };
}

export function generateMonthlyReport(input: ReportInput): ReportAnalysis {
  const { salesData, expensesData, donationsData, itemsData, transactionsData, allSalesData, allReceivablesData } = input;

  const calculateSaleProfit = (sale: Sale): number => {
    // Profit is fixed at the moment of sale when the cost is stored on the sale
    // (total cost, or per-item cost). Older sales fall back to the current
    // item cost, which is the best available estimate for them.
    const storedTotalCost = (sale as any).productionCost;
    if (typeof storedTotalCost === 'number' && Number.isFinite(storedTotalCost)) {
      return sale.total - storedTotalCost;
    }
    const perItemStoredCost = sale.items.reduce((acc, saleItem) => {
      const cost = (saleItem as any).cost;
      return typeof cost === 'number' && Number.isFinite(cost)
        ? acc + cost * saleItem.quantity
        : NaN;
    }, 0);
    if (Number.isFinite(perItemStoredCost)) {
      return sale.total - perItemStoredCost;
    }

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
      // Customer advance (credit) was already counted as cash when deposited,
      // so only the remainder of a Cash/Bank sale is new money in this month.
      const settledNow = sale.total - (sale.creditApplied || 0);
      if (sale.paymentMethod === 'Cash') {
        acc.cash += settledNow;
      } else if (sale.paymentMethod === 'Bank') {
        acc.bank += settledNow;
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

  const { sameMonth: sameMonthDueSettlements, priorMonths: recoveredFromPriorDues } = classifyDuePayments(
    `${input.yearNumber}-${String(input.monthIndex + 1).padStart(2, '0')}`,
    allSalesData,
    allReceivablesData,
  );

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
    recoveredFromPriorDues,
    sameMonthDueSettlements,
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
