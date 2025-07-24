
'use server';

// This file is an aggregator for all database actions.
// It imports from the /lib/db directory and re-exports everything.
// This allows components to import from a single file, while keeping the actions organized.

export * from './db/books';
export * from './db/customers';
export * from './db/sales';
export * from './db/purchases';
export * from './db/expenses';
export * from './db/donations';
export * from './db/transactions';
export * from './db/dashboard';
export * from './db/database';

// Specific high-level actions can also be defined here if needed,
// though it's preferred to keep them in their respective files.
import { getDocs, collection } from 'firebase/firestore';
import { db } from './firebase';
import { getBooks } from './db/books';
import { getSales } from './db/sales';
import { getExpenses } from './db/expenses';
import { getPurchases } from './db/purchases';
import { getDonations } from './db/donations';

export async function getBalanceSheetData() {
    if (!db) {
        throw new Error("Database not connected");
    }

    const [books, sales, expenses, allTransactionsData, purchases, donations] = await Promise.all([
        getBooks(),
        getSales(),
        getExpenses(),
        getDocs(collection(db, 'transactions')),
        getPurchases(),
        getDonations(),
    ]);

    const allTransactions = allTransactionsData.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    let cash = 0;
    let bank = 0;

    sales.forEach(sale => {
        if (sale.paymentMethod === 'Cash') {
            cash += sale.total;
        } else if (sale.paymentMethod === 'Bank') {
            bank += sale.total;
        } else if (sale.paymentMethod === 'Split' && sale.amountPaid) {
            // Assuming split payments from sales are cash unless specified otherwise
            cash += sale.amountPaid;
        }
    });
    
    donations.forEach(donation => {
        if (donation.paymentMethod === 'Cash') {
            cash += donation.amount;
        } else if (donation.paymentMethod === 'Bank') {
            bank += donation.amount;
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
