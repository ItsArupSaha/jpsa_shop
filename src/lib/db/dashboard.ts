
'use server';

import { collection, doc, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { docToBook, docToExpense, docToSale } from './utils';
import { getCustomersWithDueBalance } from './customers';

export async function getDashboardStats(userId: string) {
    if (!db || !userId) {
        // Return a default structure if no user or DB
        return {
            totalBooksInStock: 0,
            totalBookTitles: 0,
            monthlySalesValue: 0,
            monthlySalesCount: 0,
            monthlyExpenses: 0,
            netProfit: 0,
            receivablesAmount: 0,
            pendingReceivablesCount: 0,
        };
    }

    const userRef = doc(db, 'users', userId);
    const booksCollection = collection(userRef, 'books');
    const salesCollection = collection(userRef, 'sales');
    const expensesCollection = collection(userRef, 'expenses');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const salesQuery = query(
        salesCollection,
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate))
    );

    const expensesQuery = query(
        expensesCollection,
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate))
    );
    
    // Wrap snapshot fetching in try/catch to handle cases where collections don't exist yet for new users.
    const safeGetDocs = async (q: any) => {
        try {
            return await getDocs(q);
        } catch (error) {
            console.warn("Could not fetch collection, it might not exist for a new user.", error);
            return { docs: [] }; // Return an empty snapshot
        }
    };

    const [
        booksSnapshot, 
        salesSnapshot, 
        expensesSnapshot, 
        customersWithDue
    ] = await Promise.all([
        safeGetDocs(query(booksCollection)),
        safeGetDocs(salesQuery),
        safeGetDocs(expensesQuery),
        getCustomersWithDueBalance(userId)
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
