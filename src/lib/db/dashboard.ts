
'use server';

import { collection, doc, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { businessDayEnd, businessDayStart, businessMonthBounds, currentBusinessYMD } from './business-date';
import { getAccountOverview } from './account-overview';
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
            todaySalesValue: 0,
            todaySalesCount: 0,
            cashBalance: 0,
            bankBalance: 0,
            stockValue: 0,
        };
    }

    const userRef = doc(db, 'users', userId);
    const itemsCollection = collection(userRef, 'items');
    const salesCollection = collection(userRef, 'sales');
    const returnsCollection = collection(userRef, 'sales_returns');

    // "This month" and "today" are Bangladesh calendar days (see business-date.ts),
    // not the server's local clock.
    const nowYMD = currentBusinessYMD();
    const year = parseInt(nowYMD.slice(0, 4), 10);
    const month = parseInt(nowYMD.slice(5, 7), 10) - 1;
    const { start: startDate, end: endDate } = businessMonthBounds(year, month);
    const todayStart = businessDayStart(nowYMD);
    const todayEnd = businessDayEnd(nowYMD);

    const salesQuery = query(
        salesCollection,
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate))
    );

    const todaySalesQuery = query(
        salesCollection,
        where('date', '>=', Timestamp.fromDate(todayStart)),
        where('date', '<=', Timestamp.fromDate(todayEnd))
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
        todaySalesSnapshot,
        returnsSnapshot,
        customersWithDue,
        accountOverview
    ] = await Promise.all([
        safeGetDocs(query(itemsCollection)),
        safeGetDocs(salesQuery),
        safeGetDocs(todaySalesQuery),
        safeGetDocs(returnsQuery),
        getCustomersWithDueBalance(userId),
        getAccountOverview(userId).catch(() => null)
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

    // Profit uses the cost that was stored on the sale when it happened, so the
    // number stays stable even if later purchases change the item's cost.
    // Older sales without a stored cost fall back to the current item cost.
    const storedSaleCost = (sale: any): number | null => {
        if (typeof sale.productionCost === 'number' && Number.isFinite(sale.productionCost)) {
            return sale.productionCost;
        }
        const perItem = (sale.items || []).reduce((sum: number, item: any) => {
            if (typeof item.cost === 'number' && Number.isFinite(item.cost)) {
                return sum + item.cost * item.quantity;
            }
            return NaN;
        }, 0);
        return Number.isFinite(perItem) ? perItem : null;
    };

    const grossProfitThisMonth = salesThisMonth.reduce((totalProfit, sale: any) => {
        const stored = storedSaleCost(sale);
        if (stored !== null) {
            return totalProfit + (sale.total - stored);
        }
        // Fallback for older sales without a stored cost: sale.total is already
        // after discount, so this stays correct for 100%-discount (gift) sales
        // too — their profit is the negative cost of the given-away goods.
        const currentCost = sale.items.reduce((costSum: number, item: any) => {
            const inventoryItem = items.find(i => i.id === item.itemId);
            if (inventoryItem) {
                return costSum + inventoryItem.productionPrice * item.quantity;
            }
            return costSum;
        }, 0);
        return totalProfit + (sale.total - currentCost);
    }, 0);

    // A return reverses the profit of the returned goods, i.e. (price - cost)
    // per unit — not the raw cost.
    const returnedProfitThisMonth = returnsThisMonth.reduce((totalProfit, saleReturn: any) => {
        const returnProfit = saleReturn.items.reduce((currentReturnProfit: number, item: any) => {
            const inventoryItem = items.find(i => i.id === item.itemId);
            const unitCost = typeof item.cost === 'number' && Number.isFinite(item.cost)
                ? item.cost
                : inventoryItem ? inventoryItem.productionPrice : null;
            if (unitCost !== null) {
                return currentReturnProfit + (item.price - unitCost) * item.quantity;
            }
            return currentReturnProfit;
        }, 0);
        return totalProfit + returnProfit;
    }, 0);

    const netProfit = grossProfitThisMonth - returnedProfitThisMonth - monthlyExpenses;

    const receivablesAmount = customersWithDue.reduce((sum, c) => sum + c.dueBalance, 0);
    const pendingReceivablesCount = customersWithDue.length;

    const todaySales = todaySalesSnapshot.docs.map(docToSale);
    const todaySalesValue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const todaySalesCount = todaySales.length;

    const stockValue = items.reduce(
        (sum, item) => sum + Math.max(item.stock, 0) * item.productionPrice,
        0
    );

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
        todaySalesValue,
        todaySalesCount,
        cashBalance: accountOverview?.cash ?? 0,
        bankBalance: accountOverview?.bank ?? 0,
        stockValue,
    };
}
