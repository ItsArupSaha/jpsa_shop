'use server';

import { format } from 'date-fns';

import { getAccountOverview } from './account-overview';
import {
    inBusinessDayRange,
    isValidBusinessYMD,
    lastDayOfMonthYMD,
    shiftDayYMD,
} from './business-date';
import { getExpenses } from './expenses';
import { getPurchases } from './purchases';
import { getSales } from './sales';

export type AuthorityPeriodRow = {
    label: string;
    fromYmd: string;
    toYmd: string;
    income: number;
    expense: number;
    net: number;
};

export type AuthorityPurchaseRow = {
    purchaseId: string;
    date: string;
    supplier: string;
    totalAmount: number;
    itemSummary: string;
};

export type AuthorityPresentationReport = {
    periods: AuthorityPeriodRow[];
    opening: Awaited<ReturnType<typeof getAccountOverview>>;
    closing: Awaited<ReturnType<typeof getAccountOverview>>;
    equityStart: number;
    equityEnd: number;
    equityDelta: number;
    purchases: AuthorityPurchaseRow[];
};

/**
 * UTC-noon instant for a `yyyy-MM-dd` — renders as that same calendar day in
 * any timezone within ±11h of UTC (including Asia/Dhaka and US Pacific), so
 * `date-fns` `format` is safe on any server.
 */
function ymdToDisplayDate(ymd: string): Date {
    return new Date(Date.parse(`${ymd}T12:00:00Z`));
}

function buildPeriodBounds(startYmd: string, endYmd: string): { from: string; to: string }[] {
    const bounds: { from: string; to: string }[] = [];
    let cursor = startYmd;

    while (cursor <= endYmd) {
        const monthCap = lastDayOfMonthYMD(cursor);
        const sliceEnd = endYmd <= monthCap ? endYmd : monthCap;
        bounds.push({ from: cursor, to: sliceEnd });
        cursor = shiftDayYMD(sliceEnd, 1);
    }

    return bounds;
}

function periodLabel(fromYmd: string, toYmd: string): string {
    const from = ymdToDisplayDate(fromYmd);
    const to = ymdToDisplayDate(toYmd);
    if (format(from, 'yyyy-MM') === format(to, 'yyyy-MM')) {
        return `${format(from, 'd')}–${format(to, 'd MMM yyyy')}`;
    }
    return `${format(from, 'd MMM')} – ${format(to, 'd MMM yyyy')}`;
}

function summarizePurchaseItems(items: { itemName: string; quantity: number }[]): string {
    if (!items.length) return '';
    const preview = items.slice(0, 3).map((i) => `${i.itemName} (${i.quantity})`);
    const tail = items.length > 3 ? ` +${items.length - 3} more` : '';
    return preview.join(', ') + tail;
}

export async function getAuthorityPresentationReport(
    userId: string,
    startYmd: string,
    endYmd: string
): Promise<{ ok: true; data: AuthorityPresentationReport } | { ok: false; error: string }> {
    if (!userId) {
        return { ok: false, error: 'Not signed in.' };
    }

    if (!isValidBusinessYMD(startYmd) || !isValidBusinessYMD(endYmd)) {
        return { ok: false, error: 'Invalid start or end date.' };
    }

    if (startYmd > endYmd) {
        return { ok: false, error: 'Start date must be on or before end date.' };
    }

    // Opening balances are the closing balances of the day BEFORE the range;
    // closing balances include every transaction of the range's last day.
    // Both are Bangladesh calendar days (see business-date.ts).
    const openingAsOf = shiftDayYMD(startYmd, -1);
    const closingAsOf = endYmd;

    const [opening, closing, sales, expenses, purchases] = await Promise.all([
        getAccountOverview(userId, openingAsOf),
        getAccountOverview(userId, closingAsOf),
        getSales(userId),
        getExpenses(userId),
        getPurchases(userId),
    ]);

    const periodBounds = buildPeriodBounds(startYmd, endYmd);
    const periods: AuthorityPeriodRow[] = periodBounds.map(({ from, to }) => {
        const income = sales
            .filter((s) => inBusinessDayRange(s.date, from, to))
            .reduce((sum, s) => sum + (s.total || 0), 0);

        const expense = expenses
            .filter((e) => !e.description.startsWith('Transfer to'))
            .filter((e) => inBusinessDayRange(e.date, from, to))
            .reduce((sum, e) => sum + (e.amount || 0), 0);

        return {
            label: periodLabel(from, to),
            fromYmd: from,
            toYmd: to,
            income,
            expense,
            net: income - expense,
        };
    });

    const purchaseRows: AuthorityPurchaseRow[] = purchases
        .filter((p) => inBusinessDayRange(p.date, startYmd, endYmd))
        .map((p) => ({
            purchaseId: p.purchaseId,
            date: p.date,
            supplier: p.supplier,
            totalAmount: p.totalAmount,
            itemSummary: summarizePurchaseItems(p.items || []),
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const equityStart = opening.equity;
    const equityEnd = closing.equity;

    return {
        ok: true,
        data: {
            periods,
            opening,
            closing,
            equityStart,
            equityEnd,
            equityDelta: equityEnd - equityStart,
            purchases: purchaseRows,
        },
    };
}
