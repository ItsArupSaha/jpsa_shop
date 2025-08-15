
'use server';

import type { Item, ClosingStockItem } from '../types';
import { getItems } from './items';
import { getSales } from './sales';

/**
 * Calculates the closing stock for all items up to a specific date.
 * This is a heavy operation and should be called from a server action.
 * @param closingStockDate The date to calculate the closing stock for.
 * @returns A promise that resolves to an array of items with their closing stock.
 */
export async function calculateClosingStock(userId: string, closingStockDate: Date): Promise<ClosingStockItem[]> {
    const [allItems, allSales] = await Promise.all([getItems(userId), getSales(userId)]);

    const salesAfterDate = allSales.filter(s => new Date(s.date) > closingStockDate);

    const calculatedData = allItems.map(item => {
        const quantitySoldAfter = salesAfterDate.reduce((total, sale) => {
            const saleItem = sale.items.find(i => i.itemId === item.id);
            return total + (saleItem ? saleItem.quantity : 0);
        }, 0);
        
        return {
            ...item,
            closingStock: item.stock + quantitySoldAfter
        }
    });

    return calculatedData;
}
