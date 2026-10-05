
'use server';

import type { ClosingStock } from '../types';
import { toBusinessYMD } from './business-date';
import { closingStockQuantities } from './closing-stock';
import { getItems } from './items';
import { getPurchases } from './purchases';
import { getSales } from './sales';
import { getSalesReturns } from './sales-returns';

/**
 * Calculates the closing stock for all items up to the end of a specific
 * Bangladesh calendar day. See closing-stock.ts for how history is rebuilt.
 * @param closingStockDate The date to calculate the closing stock for.
 * @returns A promise that resolves to an array of items with their closing stock.
 */
export async function calculateClosingStock(userId: string, closingStockDate: Date): Promise<ClosingStock[]> {
    const cutoffYMD = toBusinessYMD(closingStockDate);
    if (!cutoffYMD) {
        throw new Error('Invalid closing stock date.');
    }

    const [allItems, allSales, allPurchases, allReturns] = await Promise.all([
        getItems(userId),
        getSales(userId),
        getPurchases(userId),
        getSalesReturns(userId),
    ]);

    const quantities = closingStockQuantities(
        { items: allItems, sales: allSales, purchases: allPurchases, returns: allReturns },
        cutoffYMD
    );

    return allItems.map((item) => ({
        ...item,
        closingStock: quantities.get(item.id) ?? 0,
    }));
}
