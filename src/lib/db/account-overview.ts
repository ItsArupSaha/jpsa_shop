'use server';

import { Timestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getCustomers } from './customers';
import { getExpenses } from './expenses';
import { getItems } from './items';
import { getPurchases } from './purchases';
import { getSales } from './sales';
import { getSalesReturns } from './sales-returns';

// This file provides generic account overview helpers that were
// previously only used for the balance sheet feature.

export async function getAccountOverview(userId: string, asOfDate?: Date) {
    if (!db) {
        throw new Error("Database not connected");
    }

    const cutoffTimestamp = asOfDate ? Timestamp.fromDate(asOfDate) : undefined;

    const [allItems, allSales, allExpenses, allTransactionsData, allPurchases, capitalData, allCustomers, transfersData, donationsData, allReturns] = await Promise.all([
        getItems(userId),
        getSales(userId),
        getExpenses(userId),
        getDocs(collection(db, 'users', userId, 'transactions')),
        getPurchases(userId),
        getDocs(collection(db, 'users', userId, 'capital')),
        getCustomers(userId),
        getDocs(collection(db, 'users', userId, 'transfers')),
        getDocs(collection(db, 'users', userId, 'donations')),
        getSalesReturns(userId),
    ]);

    const allTransactions = allTransactionsData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
    const allCapital = capitalData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
    const allDonations = donationsData.docs.map(doc => doc.data());
    const allTransfers = transfersData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));

    const isBeforeOrOnCutoff = (date: any): boolean => {
        if (!asOfDate) return true;
        if (!date) return false;

        // Ensure cutoff is End of Day
        const cutoff = new Date(asOfDate);
        cutoff.setHours(23, 59, 59, 999);
        const cutoffTs = Timestamp.fromDate(cutoff);

        const dateTimestamp = date instanceof Timestamp ? date : Timestamp.fromDate(new Date(date));
        return dateTimestamp.toMillis() <= cutoffTs.toMillis();
    };

    const filteredCapital = allCapital.filter((capital: any) =>
        capital.source === 'Initial Capital' || isBeforeOrOnCutoff(capital.date)
    );
    const filteredDonations = allDonations.filter((donation: any) => isBeforeOrOnCutoff(donation.date));
    const filteredSales = allSales.filter((sale: any) => isBeforeOrOnCutoff(sale.date));
    const filteredExpenses = allExpenses.filter((expense: any) => isBeforeOrOnCutoff(expense.date));
    const filteredTransfers = allTransfers.filter((transfer: any) => isBeforeOrOnCutoff(transfer.date));
    const filteredPurchases = allPurchases.filter((purchase: any) => isBeforeOrOnCutoff(purchase.date));
    const filteredTransactions = allTransactions.filter((t: any) => isBeforeOrOnCutoff(t.dueDate));
    const filteredReturns = allReturns.filter((ret: any) => isBeforeOrOnCutoff(ret.date));

    const paidTransactionsUpToCutoff = filteredTransactions.filter((t: any) => t.status === 'Paid');

    let cash = 0;
    let bank = 0;
    let otherAssets = 0;

    filteredCapital.forEach((capital: any) => {
        if (capital.paymentMethod === 'Cash') {
            cash += capital.amount;
        } else if (capital.paymentMethod === 'Bank') {
            bank += capital.amount;
        } else if (capital.paymentMethod === 'Asset') {
            otherAssets += capital.amount;
        }
    });

    filteredDonations.forEach((donation: any) => {
        if (donation.source !== 'Initial Capital' && donation.donorName !== 'Internal Transfer') {
            if (donation.paymentMethod === 'Cash') {
                cash += donation.amount;
            } else if (donation.paymentMethod === 'Bank') {
                bank += donation.amount;
            }
        }
    });

    filteredSales.forEach((sale: any) => {
        if (sale.paymentMethod === 'Cash') {
            cash += sale.total;
        } else if (sale.paymentMethod === 'Bank') {
            bank += sale.total;
        } else if (sale.paymentMethod === 'Split' && sale.amountPaid && sale.amountPaid > 0) {
            if (sale.splitPaymentMethod === 'Bank') {
                bank += sale.amountPaid;
            } else {
                cash += sale.amountPaid;
            }
        }
    });

    paidTransactionsUpToCutoff.forEach((t: any) => {
        if (t.type === 'Receivable') {
            const description = t.description || '';
            if (description.startsWith('Payment from customer')) {
                if (t.paymentMethod === 'Cash') {
                    cash += t.amount;
                } else if (t.paymentMethod === 'Bank') {
                    bank += t.amount;
                }
            }
        }
    });

    filteredExpenses.forEach((expense: any) => {
        if (expense.paymentMethod === 'Bank') {
            bank -= expense.amount;
        } else {
            cash -= expense.amount;
        }
    });

    filteredTransfers.forEach((transfer: any) => {
        if (transfer.from === 'Cash') {
            cash -= transfer.amount;
        } else if (transfer.from === 'Bank') {
            bank -= transfer.amount;
        }

        if (transfer.to === 'Cash') {
            cash += transfer.amount;
        } else if (transfer.to === 'Bank') {
            bank += transfer.amount;
        }
    });

    const stockValue = allItems.reduce((sum: number, item: any) => {
        const itemSalesAfterCutoff = allSales
            .filter((sale: any) => !isBeforeOrOnCutoff(sale.date))
            .reduce((saleSum: number, sale: any) => {
                const saleItem = sale.items.find((si: any) => si.itemId === item.id);
                if (saleItem) {
                    return saleSum + saleItem.quantity;
                }
                return saleSum;
            }, 0);

        const itemPurchasesAfterCutoff = allPurchases
            .filter((purchase: any) => !isBeforeOrOnCutoff(purchase.date))
            .reduce((purchaseSum: number, purchase: any) => {
                const purchaseItem = purchase.items.find((pi: any) => pi.categoryId === item.categoryId && pi.itemName === item.title);
                if (purchaseItem) {
                    return purchaseSum + purchaseItem.quantity;
                }
                return purchaseSum;
            }, 0);

        const closingStockAsOfDate = item.stock + itemSalesAfterCutoff - itemPurchasesAfterCutoff;
        const value = closingStockAsOfDate > 0 ? item.productionPrice * closingStockAsOfDate : 0;
        return sum + value;
    }, 0);

    const officeAssetsValue = filteredPurchases
        .flatMap((p: any) => p.items)
        .filter((i: any) => i.categoryName === 'Office Asset')
        .reduce((sum: number, item: any) => sum + (item.cost * item.quantity), 0);

    // Calculate historical receivables
    // Start with all customers' opening balances
    let receivables = allCustomers.reduce((sum: number, customer: any) => sum + (customer.openingBalance || 0), 0);

    // Add Sales Dues and Credit Usage
    filteredSales.forEach((sale: any) => {
        // Applying credit increases the balance (consuming negative balance)
        receivables += (sale.creditApplied || 0);

        if (sale.paymentMethod === 'Due') {
            receivables += sale.total;
        } else if (sale.paymentMethod === 'Split') {
            const due = sale.total - (sale.amountPaid || 0);
            receivables += due;
        }
    });

    // Subtract Payments
    paidTransactionsUpToCutoff.forEach((t: any) => {
        if (t.type === 'Receivable') {
            const description = t.description || '';
            if (description.startsWith('Payment from customer')) {
                receivables -= t.amount;
            }
        }
    });

    // Subtract Sales Returns
    filteredReturns.forEach((ret: any) => {
        receivables -= ret.totalReturnValue;
    });

    const pendingPayables = filteredTransactions.filter((t: any) => t.type === 'Payable' && t.status === 'Pending');
    const payables = pendingPayables.reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalAssets = cash + bank + receivables + stockValue + officeAssetsValue;
    const equity = totalAssets - payables;

    return {
        cash,
        bank,
        stockValue,
        officeAssetsValue,
        receivables,
        totalAssets,
        payables,
        equity,
        otherAssets,
    };
}


export async function getAccountBalances(userId: string) {
    const overview = await getAccountOverview(userId);
    return {
        cash: overview.cash,
        bank: overview.bank,
    };
}

export async function getCustomersWithDueBalanceAsOfDate(userId: string, asOfDate: Date) {
    if (!db || !userId) return [];

    const cutoffTimestamp = Timestamp.fromDate(asOfDate);
    // Ensure cutoff is End of Day
    const cutoffDate = asOfDate;
    cutoffDate.setHours(23, 59, 59, 999);
    const cutoffTs = Timestamp.fromDate(cutoffDate);

    const [allSales, allTransactionsData, allCustomers, allReturns] = await Promise.all([
        getSales(userId),
        getDocs(collection(db, 'users', userId, 'transactions')),
        getCustomers(userId),
        getSalesReturns(userId),
    ]);

    const allTransactions = allTransactionsData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));

    const isBeforeOrOnCutoff = (date: any): boolean => {
        if (!date) return false;
        const dateTimestamp = date instanceof Timestamp ? date : Timestamp.fromDate(new Date(date));
        return dateTimestamp.toMillis() <= cutoffTs.toMillis();
    };

    const filteredSales = allSales.filter((sale: any) => isBeforeOrOnCutoff(sale.date));
    const filteredTransactions = allTransactions.filter((t: any) => isBeforeOrOnCutoff(t.dueDate));
    const filteredReturns = allReturns.filter((ret: any) => isBeforeOrOnCutoff(ret.date));

    // Calculate balance for each customer
    const customersWithDue = allCustomers.map(customer => {
        let balance = customer.openingBalance || 0;

        // Add Sales logic
        filteredSales.filter((s: any) => s.customerId === customer.id).forEach((sale: any) => {
            balance += (sale.creditApplied || 0);

            if (sale.paymentMethod === 'Due') {
                balance += sale.total;
            } else if (sale.paymentMethod === 'Split') {
                const due = sale.total - (sale.amountPaid || 0);
                balance += due;
            }
        });

        // Subtract Payments logic
        filteredTransactions.filter((t: any) => t.customerId === customer.id).forEach((t: any) => {
            if (t.type === 'Receivable') {
                // Check if it's a payment or manually added receivable
                // In account-overview.ts logic for "Receivables" total:
                // "Subtract Payments" section checks: 
                // if (t.type === 'Receivable') {
                //   const description = t.description || '';
                //   if (description.startsWith('Payment from customer')) {
                //       receivables -= t.amount;
                //   }
                // } 
                // Wait, account-overview.ts logic seems to only subtract "Payment from customer".
                // But what about manual receivables? 
                // If I manually ADD a receivable, it increases the balance.
                // Let's check account-overview.ts again.

                const description = t.description || '';
                if (description.startsWith('Payment from customer')) {
                    balance -= t.amount;
                } else {
                    // It is a manually added receivable (e.g. "Due from Sale #" or manual entry)
                    // Does account-overview.ts logic ACCOUNT for manual receivables?
                    // Let's re-read account-overview.ts step 59 carefully.
                    /*
                       // Add Sales Dues and Credit Usage
                       filteredSales.forEach(...) 
                       
                       // Subtract Payments
                       paidTransactionsUpToCutoff.forEach((t: any) => {
                           if (t.type === 'Receivable') {
                               const description = t.description || '';
                               if (description.startsWith('Payment from customer')) {
                                   receivables -= t.amount;
                               }
                           }
                       });
                    */
                    // It SEEMS account-overview.ts IGNORES manual receivables that come from Sales (description "Due from ...") because those are already counted in "Add Sales Dues".
                    // BUT what about purely manual receivables created via "Add Transaction"?
                    // If I go to Receivables page and click "Add Receivable"? 
                    // Wait, `addTransaction` in `transactions.ts` sets `status: 'Pending'`.
                    // `account-overview.ts` calculates `receivables` variable. 
                    // Does it include manually added pending receivables?
                    // Looking at `account-overview.ts`:
                    // It iterates `filteredSales` and adds dues.
                    // It iterates `paidTransactionsUpToCutoff` and subtracts payments.
                    // It does NOT seem to iterate `pendingTransactions` to add them!
                    // This might be a bug in `account-overview.ts` OR manual receivables are rare/not supported in the same way.
                    // However, `getCustomersWithDueBalance` in `customers.ts` relies on `d.data().dueBalance` stored in Firestore.
                    // `addTransaction` updates `customer.dueBalance`? No, `addPayment` updates it. `addSale` updates it.
                    // Does `addTransaction` update it?
                    // Checking `transactions.ts`: `addTransaction` ... `revalidatePath`. It does NOT update `customer.dueBalance` automatically for manual transactions?
                    // WAIT. `addTransaction` implementation in `transactions.ts` (Step 64):
                    // It effectively just adds a doc. It does NOT update customer balance!
                    // This means manual Receivables do NOT affect the `customer.dueBalance` field in Firestore?
                    // If so, then `account-overview.ts` logic is consistent with "Only Sales create Dues".
                    // BUT `addPayment` reduces `dueBalance`.
                    // User's request: "Pending Due Receivable".
                    // If manual receivables don't update balance, maybe they aren't used often or I missed something.
                    // I will stick to `account-overview.ts` logic as requested by user ("you can use that same implementation here").
                }
            }
        });

        // Subtract Returns logic
        filteredReturns.filter((r: any) => r.customerId === customer.id).forEach((ret: any) => {
            balance -= ret.totalReturnValue;
        });

        return {
            ...customer,
            dueBalance: balance
        };
    }).filter(c => c.dueBalance > 0.01); // Filter out zero/negative balances, use small epsilon

    return customersWithDue;
}

/**
 * Get all pending payables as of a specific date.
 * Returns payables that were created on or before the asOfDate and were still Pending.
 */
export async function getPayablesAsOfDate(userId: string, asOfDate: Date) {
    if (!db || !userId) return [];

    // Ensure cutoff is End of Day
    const cutoffDate = new Date(asOfDate);
    cutoffDate.setHours(23, 59, 59, 999);
    const cutoffTs = Timestamp.fromDate(cutoffDate);

    const transactionsData = await getDocs(collection(db, 'users', userId, 'transactions'));
    const allTransactions = transactionsData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));

    const isBeforeOrOnCutoff = (date: any): boolean => {
        if (!date) return false;
        const dateTimestamp = date instanceof Timestamp ? date : Timestamp.fromDate(new Date(date));
        return dateTimestamp.toMillis() <= cutoffTs.toMillis();
    };

    // Filter to Payable type transactions created on or before cutoff date
    // We consider a payable "pending as of date" if it was created on or before that date
    // and either is still Pending OR was paid after the cutoff date
    const pendingPayablesAsOfDate = allTransactions.filter((t: any) => {
        if (t.type !== 'Payable') return false;
        if (!isBeforeOrOnCutoff(t.dueDate)) return false;

        // If it's currently pending, include it
        if (t.status === 'Pending') return true;

        // If it was paid, check if it was paid after the cutoff date
        // For now, we'll include all payables created before cutoff that are pending
        // A more accurate implementation would track payment date separately
        // But based on the current schema, we can only check status
        return t.status === 'Pending';
    });

    return pendingPayablesAsOfDate.map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        dueDate: t.dueDate instanceof Timestamp ? t.dueDate.toDate().toISOString() : t.dueDate,
        status: t.status,
        type: t.type,
    }));
}
