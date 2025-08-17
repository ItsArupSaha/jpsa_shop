
'use server';

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getCustomersWithDueBalance } from './customers';
import { getDonations } from './donations';
import { getExpenses } from './expenses';
import { getItems } from './items';
import { getPurchases } from './purchases';
import { getSales } from './sales';

export async function getBalanceSheetData(userId: string) {
    if (!db) {
        throw new Error("Database not connected");
    }

    const [items, sales, expenses, allTransactionsData, purchases, donations, customersWithDue, transfersData, capitalData] = await Promise.all([
        getItems(userId),
        getSales(userId),
        getExpenses(userId),
        getDocs(collection(db, 'users', userId, 'transactions')),
        getPurchases(userId),
        getDonations(userId),
        getCustomersWithDueBalance(userId), // Use the same trusted function as the dashboard
        getDocs(collection(db, 'users', userId, 'transfers')),
        getDocs(collection(db, 'users', userId, 'capital')),
    ]);

    const allTransactions = allTransactionsData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
    const allCapital = capitalData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));

    let cash = 0;
    let bank = 0;

    // Handle initial capital
    allCapital.forEach((capital: any) => {
        if (capital.paymentMethod === 'Cash') {
            cash += capital.amount;
        } else if (capital.paymentMethod === 'Bank') {
            bank += capital.amount;
        }
    });

    // Handle donations
    donations.forEach((donation: any) => {
        if (donation.paymentMethod === 'Cash') {
            cash += donation.amount;
        } else if (donation.paymentMethod === 'Bank') {
            bank += donation.amount;
        }
    });

    sales.forEach((sale: any) => {
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
    const receivedPayments = allTransactions.filter((t: any) => t.type === 'Receivable' && t.status === 'Paid');
    
    receivedPayments.forEach((t: any) => {
        if (t.paymentMethod === 'Cash') {
            cash += t.amount;
        } else if (t.paymentMethod === 'Bank') {
            bank += t.amount;
        }
    });

    expenses.forEach((expense: any) => {
        if (expense.paymentMethod === 'Bank') {
            bank -= expense.amount;
        } else {
            cash -= expense.amount;
        }
    });

    // Handle transfers: simple subtraction and addition
    const transfers = transfersData.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    transfers.forEach((transfer: any) => {
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

    const stockValue = items.reduce((sum: number, item: any) => sum + (item.productionPrice * item.stock), 0);

    const officeAssetsValue = purchases
        .flatMap((p: any) => p.items)
        .filter((i: any) => i.category === 'Office Asset')
        .reduce((sum: number, item: any) => sum + (item.cost * item.quantity), 0);

    // This is the corrected logic, using the same source as the dashboard.
    const receivables = customersWithDue.reduce((sum: number, customer: any) => sum + customer.dueBalance, 0);

    const payables = allTransactions
        .filter((t: any) => t.type === 'Payable' && t.status === 'Pending')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

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
