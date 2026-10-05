import { toBusinessYMD } from './business-date';
import type { Item, Purchase, Sale, SalesReturn } from '../types';

/**
 * Single source of truth for "how many units of each item were in stock at the
 * end of a Bangladesh calendar day".
 *
 * Current stock is the sum of everything that ever happened, so the closing
 * stock of a past day is reconstructed by walking BACKWARDS from today and
 * undoing everything that happened after that day:
 *
 *   closingQty = currentStock
 *              + sold after the day      (sales remove stock, undo them)
 *              - purchased after the day (purchases add stock, undo them)
 *              - returned after the day  (returns add stock back, undo them)
 *
 * Purchases match items by stored itemId when present, otherwise by category +
 * normalized title (the purchase forms predate itemId). Items created after the
 * day did not exist yet and close at 0.
 */

export type ClosingStockSourceData = {
    items: Item[];
    sales: Sale[];
    purchases: Purchase[];
    returns: SalesReturn[];
};

const normalizeTitle = (title: unknown): string =>
    String(title ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

/** Quantity of `purchaseItem` that belongs to `item`; 0 when it is a different product. */
function purchaseItemQuantityForItem(purchaseItem: any, item: Item): number {
    const qty = Number(purchaseItem?.quantity);
    if (!Number.isFinite(qty) || qty === 0) return 0;

    const itemId = purchaseItem?.itemId;
    if (itemId) return itemId === item.id ? qty : 0;

    const sameCategory = purchaseItem?.categoryId
        ? purchaseItem.categoryId === item.categoryId
        : normalizeTitle(purchaseItem?.categoryName) === normalizeTitle(item.categoryName);
    if (!sameCategory) return 0;
    return normalizeTitle(purchaseItem?.itemName) === normalizeTitle(item.title) ? qty : 0;
}

/** Closing quantity per item id as of the end of Bangladesh day `cutoffYMD`. */
export function closingStockQuantities(
    data: ClosingStockSourceData,
    cutoffYMD: string
): Map<string, number> {
    const quantities = new Map<string, number>();
    for (const item of data.items) {
        quantities.set(item.id, Number(item.stock) || 0);
    }

    const isAfterCutoff = (date: unknown): boolean => {
        const day = toBusinessYMD(date);
        return day !== null && day > cutoffYMD;
    };

    for (const sale of data.sales) {
        if (!isAfterCutoff(sale.date)) continue;
        for (const saleItem of sale.items || []) {
            const qty = Number(saleItem?.quantity) || 0;
            if (quantities.has(saleItem.itemId)) {
                quantities.set(saleItem.itemId, (quantities.get(saleItem.itemId) || 0) + qty);
            }
        }
    }

    for (const purchase of data.purchases) {
        if (!isAfterCutoff(purchase.date)) continue;
        for (const purchaseItem of purchase.items || []) {
            for (const item of data.items) {
                const qty = purchaseItemQuantityForItem(purchaseItem, item);
                if (qty > 0) {
                    quantities.set(item.id, (quantities.get(item.id) || 0) - qty);
                }
            }
        }
    }

    for (const salesReturn of data.returns) {
        if (!isAfterCutoff(salesReturn.date)) continue;
        for (const returnItem of salesReturn.items || []) {
            const qty = Number(returnItem?.quantity) || 0;
            if (quantities.has(returnItem.itemId)) {
                quantities.set(returnItem.itemId, (quantities.get(returnItem.itemId) || 0) - qty);
            }
        }
    }

    // Items that were only created after the cutoff day did not exist yet.
    for (const item of data.items) {
        const createdDay = toBusinessYMD((item as any).createdAt);
        if (createdDay !== null && createdDay > cutoffYMD) {
            quantities.set(item.id, 0);
        }
    }

    return quantities;
}
