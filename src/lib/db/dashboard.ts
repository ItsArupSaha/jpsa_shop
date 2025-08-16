
'use server';

import { collection, doc, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getCustomersWithDueBalance } from './customers';
import { getExpensesForMonth } from './expenses';
import { docToItem, docToSale, docToSalesReturn } from './utils';

export async function getDashboardStats(userId: string) {
    if (!db || !userId) {
        // Return a default structure if no user or DB
        return {
            totalItemsInStock: 0,
            totalItemTitles: 0,
            itemsByCategory: {},
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
        customersWithDue
    ] = await Promise.all([
        safeGetDocs(query(itemsCollection)),
        safeGetDocs(salesQuery),
        safeGetDocs(returnsQuery),
        getCustomersWithDueBalance(userId)
    ]);

    const items = itemsSnapshot.docs.map(docToItem);
    const salesThisMonth = salesSnapshot.docs.map(docToSale);
    const returnsThisMonth = returnsSnapshot.docs.map(docToSalesReturn);
    const expensesThisMonth = await getExpensesForMonth(userId, year, month);

    const totalItemsInStock = items.reduce((sum, item) => sum + item.stock, 0);
    const totalItemTitles = items.length;
    
    // Group items by category
    const itemsByCategory = items.reduce((acc, item) => {
        const category = item.categoryName || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = {
                count: 0,
                stock: 0,
                titles: []
            };
        }
        acc[category].count += 1;
        acc[category].stock += item.stock;
        acc[category].titles.push(item.title);
        return acc;
    }, {} as Record<string, { count: number; stock: number; titles: string[] }>);
    
    const monthlySalesValue = salesThisMonth.reduce((sum, sale) => sum + sale.total, 0);
    const monthlySalesCount = salesThisMonth.length;
    
    const monthlyExpenses = expensesThisMonth.reduce((sum: number, expense: any) => sum + expense.amount, 0);

    const grossProfitThisMonth = salesThisMonth.reduce((totalProfit, sale) => {
        const saleProfit = sale.items.reduce((currentSaleProfit, item) => {
            const inventoryItem = items.find(i => i.id === item.itemId);
            if (inventoryItem) {
                const itemProfit = (item.price - inventoryItem.productionPrice) * item.quantity;
                return currentSaleProfit + itemProfit;
            }
            return currentSaleProfit;
        }, 0);
        return totalProfit + saleProfit;
    }, 0);

    const totalReturnCost = returnsThisMonth.reduce((totalCost, saleReturn) => {
        const returnCost = saleReturn.items.reduce((currentReturnCost, item) => {
            const inventoryItem = items.find(i => i.id === item.itemId);
            if (inventoryItem) {
                const itemCost = inventoryItem.productionPrice * item.quantity;
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
        totalItemsInStock,
        totalItemTitles,
        itemsByCategory,
        monthlySalesValue,
        monthlySalesCount,
        monthlyExpenses,
        netProfit,
        receivablesAmount,
        pendingReceivablesCount,
    };
}
