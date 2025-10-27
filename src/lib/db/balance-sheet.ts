
'use server';

import { Timestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getCustomersWithDueBalance } from './customers';
import { getExpenses } from './expenses';
import { getItems } from './items';
import { getPurchases } from './purchases';
import { getSales } from './sales';

export async function getBalanceSheetData(userId: string, asOfDate?: Date) {
    if (!db) {
        throw new Error("Database not connected");
    }

    // If asOfDate is provided, we need to get data up to that date
    const cutoffTimestamp = asOfDate ? Timestamp.fromDate(asOfDate) : undefined;

    // Fetch all required data sources in parallel
    const [allItems, allSales, allExpenses, allTransactionsData, allPurchases, capitalData, customersWithDue, transfersData, donationsData] = await Promise.all([
        getItems(userId),
        getSales(userId),
        getExpenses(userId),
        getDocs(collection(db, 'users', userId, 'transactions')),
        getPurchases(userId),
        getDocs(collection(db, 'users', userId, 'capital')),
        getCustomersWithDueBalance(userId),
        getDocs(collection(db, 'users', userId, 'transfers')),
        getDocs(collection(db, 'users', userId, 'donations')),
    ]);

    const allTransactions = allTransactionsData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
    const allCapital = capitalData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
    const allDonations = donationsData.docs.map(doc => doc.data());
    const allTransfers = transfersData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));

    // Helper function to check if a date is before or on the cutoff date
    const isBeforeOrOnCutoff = (date: any): boolean => {
        if (!asOfDate || !cutoffTimestamp) return true;
        if (!date) return false;
        const dateTimestamp = date instanceof Timestamp ? date : Timestamp.fromDate(new Date(date));
        return dateTimestamp.toMillis() <= cutoffTimestamp.toMillis();
    };

    // Filter data based on asOfDate
    const filteredCapital = allCapital.filter((capital: any) => isBeforeOrOnCutoff(capital.date));
    const filteredDonations = allDonations.filter((donation: any) => isBeforeOrOnCutoff(donation.date));
    const filteredSales = allSales.filter((sale: any) => isBeforeOrOnCutoff(sale.date));
    const filteredExpenses = allExpenses.filter((expense: any) => isBeforeOrOnCutoff(expense.date));
    const filteredTransfers = allTransfers.filter((transfer: any) => isBeforeOrOnCutoff(transfer.date));
    const filteredPurchases = allPurchases.filter((purchase: any) => isBeforeOrOnCutoff(purchase.date));
    
    // Filter transactions by their dueDate
    const filteredTransactions = allTransactions.filter((t: any) => isBeforeOrOnCutoff(t.dueDate));

    // Get paid transactions only up to cutoff date
    const paidTransactionsUpToCutoff = filteredTransactions.filter((t: any) => t.status === 'Paid' && isBeforeOrOnCutoff(t.dueDate));

    let cash = 0;
    let bank = 0;
    let otherAssets = 0; // For existing assets added as capital

    // Handle initial capital and any adjustments
    filteredCapital.forEach((capital: any) => {
        if (capital.paymentMethod === 'Cash') {
            cash += capital.amount;
        } else if (capital.paymentMethod === 'Bank') {
            bank += capital.amount;
        } else if (capital.paymentMethod === 'Asset') {
            otherAssets += capital.amount;
        }
    });

    // Handle regular donations
    filteredDonations.forEach((donation: any) => {
        if (donation.source !== 'Initial Capital' && donation.donorName !== 'Internal Transfer') {
            if (donation.paymentMethod === 'Cash') {
                cash += donation.amount;
            } else if (donation.paymentMethod === 'Bank') {
                bank += donation.amount;
            }
        }
    });

    // Handle sales
    filteredSales.forEach((sale: any) => {
        if (sale.paymentMethod === 'Cash') {
            cash += sale.total;
        } else if (sale.paymentMethod === 'Bank') {
            bank += sale.total;
        } else if (sale.paymentMethod === 'Split' && sale.amountPaid) {
            if (sale.splitPaymentMethod === 'Bank') {
                bank += sale.amountPaid;
            } else {
                cash += sale.amountPaid;
            }
        }
    });

    // Handle payments received from customers
    paidTransactionsUpToCutoff.forEach((t: any) => {
        if (t.type === 'Receivable') {
            if (t.paymentMethod === 'Cash') {
                cash += t.amount;
            } else if (t.paymentMethod === 'Bank') {
                bank += t.amount;
            }
        }
    });

    // Handle expenses
    filteredExpenses.forEach((expense: any) => {
        if (expense.paymentMethod === 'Bank') {
            bank -= expense.amount;
        } else {
            cash -= expense.amount;
        }
    });

    // Handle transfers
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

    // Calculate stock value as of the date
    // Current stock represents today's stock
    // Stock as of date = current stock + sales after date - purchases after date
    const stockValue = allItems.reduce((sum: number, item: any) => {
        // Get sales of this item AFTER cutoff date
        const itemSalesAfterCutoff = allSales
            .filter((sale: any) => !isBeforeOrOnCutoff(sale.date))
            .reduce((saleSum: number, sale: any) => {
                const saleItem = sale.items.find((si: any) => si.itemId === item.id);
                if (saleItem) {
                    return saleSum + saleItem.quantity;
                }
                return saleSum;
            }, 0);

        // Get purchases of this item AFTER cutoff date
        const itemPurchasesAfterCutoff = allPurchases
            .filter((purchase: any) => !isBeforeOrOnCutoff(purchase.date))
            .reduce((purchaseSum: number, purchase: any) => {
                const purchaseItem = purchase.items.find((pi: any) => pi.categoryId === item.categoryId && pi.itemName === item.title);
                if (purchaseItem) {
                    return purchaseSum + purchaseItem.quantity;
                }
                return purchaseSum;
            }, 0);

        // Stock as of date = current stock - net change after date
        const closingStockAsOfDate = item.stock + itemSalesAfterCutoff - itemPurchasesAfterCutoff;
        const value = closingStockAsOfDate > 0 ? item.productionPrice * closingStockAsOfDate : 0;
        return sum + value;
    }, 0);

    const officeAssetsValue = filteredPurchases
        .flatMap((p: any) => p.items)
        .filter((i: any) => i.categoryName === 'Office Asset')
        .reduce((sum: number, item: any) => sum + (item.cost * item.quantity), 0);

    // Calculate receivables as of the date (only pending transactions up to cutoff)
    const pendingReceivables = filteredTransactions.filter((t: any) => t.type === 'Receivable' && t.status === 'Pending');
    const receivables = pendingReceivables.reduce((sum: number, t: any) => sum + t.amount, 0);

    // Calculate payables as of the date
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
        equity
    };
}
