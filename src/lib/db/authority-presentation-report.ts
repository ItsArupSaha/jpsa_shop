'use server';

import { addDays, endOfDay, endOfMonth, format, isAfter, startOfDay } from 'date-fns';

import { getAccountOverview } from './account-overview';
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

function parseLocalYmd(ymd: string): Date {
    const parts = ymd.split('-').map((v) => parseInt(v, 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
        throw new Error('Invalid date');
    }
    const [y, m, d] = parts;
    return new Date(y, m - 1, d);
}

function inInclusiveDayRange(isoDate: string, fromDay: Date, toDay: Date): boolean {
    const t = new Date(isoDate).getTime();
    return t >= startOfDay(fromDay).getTime() && t <= endOfDay(toDay).getTime();
}

function lastCalendarDayOfMonth(dayInMonth: Date): Date {
    return startOfDay(endOfMonth(dayInMonth));
}

function buildPeriodBounds(rangeStart: Date, rangeEnd: Date): { from: Date; to: Date }[] {
    const bounds: { from: Date; to: Date }[] = [];
    let cursor = startOfDay(rangeStart);
    const endDay = startOfDay(rangeEnd);

    while (!isAfter(cursor, endDay)) {
        const monthCap = lastCalendarDayOfMonth(cursor);
        const sliceEnd = endDay.getTime() <= monthCap.getTime() ? endDay : monthCap;
        bounds.push({ from: cursor, to: sliceEnd });
        cursor = startOfDay(addDays(sliceEnd, 1));
    }

    return bounds;
}

function periodLabel(from: Date, to: Date): string {
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

    let rangeStart: Date;
    let rangeEnd: Date;
    try {
        rangeStart = startOfDay(parseLocalYmd(startYmd));
        rangeEnd = startOfDay(parseLocalYmd(endYmd));
    } catch {
        return { ok: false, error: 'Invalid start or end date.' };
    }

    if (isAfter(rangeStart, rangeEnd)) {
        return { ok: false, error: 'Start date must be on or before end date.' };
    }

    const openingAsOf = endOfDay(rangeStart);
    const closingAsOf = endOfDay(rangeEnd);

    const [opening, closing, sales, expenses, purchases] = await Promise.all([
        getAccountOverview(userId, openingAsOf),
        getAccountOverview(userId, closingAsOf),
        getSales(userId),
        getExpenses(userId),
        getPurchases(userId),
    ]);

    const periodBounds = buildPeriodBounds(rangeStart, rangeEnd);
    const periods: AuthorityPeriodRow[] = periodBounds.map(({ from, to }) => {
        const income = sales
            .filter((s) => inInclusiveDayRange(s.date, from, to))
            .reduce((sum, s) => sum + (s.total || 0), 0);

        const expense = expenses
            .filter((e) => !e.description.startsWith('Transfer to'))
            .filter((e) => inInclusiveDayRange(e.date, from, to))
            .reduce((sum, e) => sum + (e.amount || 0), 0);

        return {
            label: periodLabel(from, to),
            fromYmd: format(from, 'yyyy-MM-dd'),
            toYmd: format(to, 'yyyy-MM-dd'),
            income,
            expense,
            net: income - expense,
        };
    });

    const purchaseRows: AuthorityPurchaseRow[] = purchases
        .filter((p) => inInclusiveDayRange(p.date, rangeStart, rangeEnd))
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
