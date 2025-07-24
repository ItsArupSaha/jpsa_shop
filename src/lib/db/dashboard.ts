
'use server';

import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { docToBook, docToExpense, docToSale } from './utils';
import { getBooks } from './books';
import { getCustomersWithDueBalance } from './customers';

export async function getDashboardStats() {
    if (!db) {
        throw new Error("Database not connected");
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const salesQuery = query(
        collection(db, 'sales'),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate))
    );

    const expensesQuery = query(
        collection(db, 'expenses'),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate))
    );

    const [
        booksSnapshot, 
        salesSnapshot, 
        expensesSnapshot, 
        customersWithDue
    ] = await Promise.all([
        getDocs(query(collection(db, 'books'))),
        getDocs(salesQuery),
        getDocs(expensesQuery),
        getCustomersWithDueBalance()
    ]);

    const books = booksSnapshot.docs.map(docToBook);
    const salesThisMonth = salesSnapshot.docs.map(docToSale);
    const expensesThisMonth = expensesSnapshot.docs.map(docToExpense);

    const totalBooksInStock = books.reduce((sum, book) => sum + book.stock, 0);
    const totalBookTitles = books.length;
    
    const monthlySalesValue = salesThisMonth.reduce((sum, sale) => sum + sale.total, 0);
    const monthlySalesCount = salesThisMonth.length;
    
    const monthlyExpenses = expensesThisMonth.reduce((sum, expense) => sum + expense.amount, 0);

    const grossProfitThisMonth = salesThisMonth.reduce((totalProfit, sale) => {
        const saleProfit = sale.items.reduce((currentSaleProfit, item) => {
            const book = books.find(b => b.id === item.bookId);
            if (book) {
                const itemProfit = (item.price - book.productionPrice) * item.quantity;
                return currentSaleProfit + itemProfit;
            }
            return currentSaleProfit;
        }, 0);
        return totalProfit + saleProfit;
    }, 0);

    const netProfit = grossProfitThisMonth - monthlyExpenses;

    const receivablesAmount = customersWithDue.reduce((sum, c) => sum + c.dueBalance, 0);
    const pendingReceivablesCount = customersWithDue.length;

    return {
        totalBooksInStock,
        totalBookTitles,
        monthlySalesValue,
        monthlySalesCount,
        monthlyExpenses,
        netProfit,
        receivablesAmount,
        pendingReceivablesCount,
    };
}
