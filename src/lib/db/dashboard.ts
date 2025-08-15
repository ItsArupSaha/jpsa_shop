
'use server';

import { collection, doc, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { docToItem, docToExpense, docToSale, docToSalesReturn } from './utils';
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
    const itemsCollection = collection(userRef, 'items');
    const salesCollection = collection(userRef, 'sales');
    const returnsCollection = collection(userRef, 'sales_returns');
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
    
    const returnsQuery = query(
        returnsCollection,
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
        itemsSnapshot, 
        salesSnapshot, 
        returnsSnapshot,
        expensesSnapshot, 
        customersWithDue
    ] = await Promise.all([
        safeGetDocs(query(itemsCollection)),
        safeGetDocs(salesQuery),
        safeGetDocs(returnsQuery),
        safeGetDocs(expensesQuery),
        getCustomersWithDueBalance(userId)
    ]);

    const items = itemsSnapshot.docs.map(docToItem);
    const salesThisMonth = salesSnapshot.docs.map(docToSale);
    const returnsThisMonth = returnsSnapshot.docs.map(docToSalesReturn);
    const expensesThisMonth = expensesSnapshot.docs.map(docToExpense);

    const totalBooksInStock = items.reduce((sum, item) => sum + item.stock, 0);
    const totalBookTitles = items.length;
    
    const monthlySalesValue = salesThisMonth.reduce((sum, sale) => sum + sale.total, 0);
    const monthlySalesCount = salesThisMonth.length;
    
    const monthlyExpenses = expensesThisMonth.reduce((sum, expense) => sum + expense.amount, 0);

    const grossProfitThisMonth = salesThisMonth.reduce((totalProfit, sale) => {
        const saleProfit = sale.items.reduce((currentSaleProfit, saleItem) => {
            const item = items.find(b => b.id === saleItem.itemId);
            if (item) {
                const itemProfit = (saleItem.price - item.productionPrice) * saleItem.quantity;
                return currentSaleProfit + itemProfit;
            }
            return currentSaleProfit;
        }, 0);
        return totalProfit + saleProfit;
    }, 0);

    const totalReturnCost = returnsThisMonth.reduce((totalCost, saleReturn) => {
        const returnCost = saleReturn.items.reduce((currentReturnCost, returnItem) => {
            const item = items.find(b => b.id === returnItem.itemId);
            if (item) {
                const itemCost = item.productionPrice * returnItem.quantity;
                return currentReturnCost + itemCost;
            }
            return currentReturnCost;
        }, 0);
        return totalCost + returnCost;
    }, 0);

    const netProfit = grossProfitThisMonth - monthlyExpenses - totalReturnCost;

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
