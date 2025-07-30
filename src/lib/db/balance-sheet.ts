
'use server';

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getBooks } from './books';
import { getDonations } from './donations';
import { getExpenses } from './expenses';
import { getPurchases } from './purchases';
import { getSales } from './sales';

export async function getBalanceSheetData(userId: string) {
    if (!db) {
        throw new Error("Database not connected");
    }

    const [books, sales, expenses, allTransactionsData, purchases, donations] = await Promise.all([
        getBooks(userId),
        getSales(userId),
        getExpenses(userId),
        getDocs(collection(db, 'users', userId, 'transactions')),
        getPurchases(userId),
        getDonations(userId),
    ]);

    const allTransactions = allTransactionsData.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    let cash = 0;
    let bank = 0;

    // Capital contributions are recorded as donations
    donations.forEach(donation => {
        if (donation.paymentMethod === 'Cash') {
            cash += donation.amount;
        } else if (donation.paymentMethod === 'Bank') {
            bank += donation.amount;
        }
    });

    sales.forEach(sale => {
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

    allTransactions.forEach((t: any) => {
        if (t.type === 'Receivable' && t.status === 'Paid' && t.description.includes('Payment from customer')) {
            if (t.paymentMethod === 'Cash') {
                cash += t.amount;
            } else if (t.paymentMethod === 'Bank') {
                bank += t.amount;
            }
        }
    });

    expenses.forEach(expense => {
        if (expense.paymentMethod === 'Bank') {
            bank -= expense.amount;
        } else {
            cash -= expense.amount;
        }
    });

    const stockValue = books.reduce((sum, book) => sum + (book.productionPrice * book.stock), 0);

    const officeAssetsValue = purchases
        .flatMap(p => p.items)
        .filter(i => i.category === 'Office Asset')
        .reduce((sum, item) => sum + (item.cost * item.quantity), 0);

    const receivables = allTransactions
        .filter((t: any) => t.type === 'Receivable' && t.status === 'Pending')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

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
