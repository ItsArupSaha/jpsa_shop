
'use server';

import type { Book, ClosingStock } from '../types';
import { getBooks } from './books';
import { getSales } from './sales';

/**
 * Calculates the closing stock for all books up to a specific date.
 * This is a heavy operation and should be called from a server action.
 * @param closingStockDate The date to calculate the closing stock for.
 * @returns A promise that resolves to an array of books with their closing stock.
 */
export async function calculateClosingStock(userId: string, closingStockDate: Date): Promise<ClosingStock[]> {
    const [allBooks, allSales] = await Promise.all([getBooks(userId), getSales(userId)]);

    const salesAfterDate = allSales.filter(s => new Date(s.date) > closingStockDate);

    const calculatedData = allBooks.map(book => {
        const quantitySoldAfter = salesAfterDate.reduce((total, sale) => {
            const item = sale.items.find(i => i.bookId === book.id);
            return total + (item ? item.quantity : 0);
        }, 0);
        
        return {
            ...book,
            closingStock: book.stock + quantitySoldAfter
        }
    });

    return calculatedData;
}
