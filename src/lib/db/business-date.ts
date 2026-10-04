
import { Timestamp } from 'firebase/firestore';

/**
 * All business dates in this app (sales, expenses, transfers, donations, ...)
 * are stored in Firestore as the instant of that calendar day's MIDNIGHT in
 * Asia/Dhaka (UTC+6, no daylight saving), because that is what the browser
 * produces when a date is picked. Day/month boundaries must therefore always
 * be derived with this fixed offset.
 *
 * Never use server-local helpers such as `setHours`, `startOfDay`, `endOfDay`
 * or `new Date(year, month, 1)` for these comparisons: on a server running in
 * UTC (e.g. the deployed instance) they shift every boundary by six hours and
 * pull next-day records into earlier reports.
 *
 * Everything in this module uses UTC-only operations, so results are identical
 * regardless of the server's timezone.
 */

export const BUSINESS_TZ_OFFSET_MS = 6 * 60 * 60 * 1000;

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar day written as `yyyy-MM-dd` (rejects 2026-02-30, 2026-13-01, ...). */
export function isValidBusinessYMD(value: unknown): value is string {
    if (typeof value !== 'string' || !YMD_RE.test(value)) return false;
    const t = Date.parse(`${value}T00:00:00Z`);
    return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === value;
}

/**
 * Bangladesh calendar day (`yyyy-MM-dd`) of any stored date value.
 * Accepts Firestore Timestamps, Dates, ISO strings (with offset) and plain
 * `yyyy-MM-dd` strings. Returns null when the value is missing or unparseable.
 */
export function toBusinessYMD(date: unknown): string | null {
    let ms: number | null = null;
    if (date instanceof Timestamp) {
        ms = date.toMillis();
    } else if (date instanceof Date) {
        ms = date.getTime();
    } else if (typeof date === 'string' && date) {
        ms = Date.parse(date); // date-only forms parse as UTC midnight by spec
    }
    if (ms === null || Number.isNaN(ms)) return null;
    return new Date(ms + BUSINESS_TZ_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Replacement for the old `isBeforeOrOnCutoff`:
 * - no cutoff day  -> include everything (mirrors `if (!asOfDate) return true`)
 * - unusable date  -> exclude (mirrors `if (!date) return false`)
 * - otherwise      -> include when the record's Bangladesh day is on or before the cutoff day.
 */
export function onOrBeforeBusinessDay(date: unknown, cutoffYMD: string | null | undefined): boolean {
    if (!cutoffYMD) return true;
    const day = toBusinessYMD(date);
    return day !== null && day <= cutoffYMD;
}

/** Inclusive Bangladesh-day range test, bounds as `yyyy-MM-dd`. */
export function inBusinessDayRange(date: unknown, fromYMD: string, toYMD: string): boolean {
    const day = toBusinessYMD(date);
    return day !== null && day >= fromYMD && day <= toYMD;
}

/** UTC instant of Bangladesh midnight starting `ymd`. */
export function businessDayStart(ymd: string): Date {
    return new Date(Date.parse(`${ymd}T00:00:00Z`) - BUSINESS_TZ_OFFSET_MS);
}

/** UTC instant of the last millisecond of Bangladesh day `ymd`. */
export function businessDayEnd(ymd: string): Date {
    return new Date(Date.parse(`${ymd}T00:00:00Z`) + 86_400_000 - BUSINESS_TZ_OFFSET_MS - 1);
}

/** `ymd` shifted by `days` calendar days (UTC arithmetic — no DST). */
export function shiftDayYMD(ymd: string, days: number): string {
    return new Date(Date.parse(`${ymd}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Last calendar day (`yyyy-MM-dd`) of the month containing `ymd`. */
export function lastDayOfMonthYMD(ymd: string): string {
    const noon = new Date(Date.parse(`${ymd}T12:00:00Z`));
    return new Date(Date.UTC(noon.getUTCFullYear(), noon.getUTCMonth() + 1, 0, 12)).toISOString().slice(0, 10);
}

/**
 * Bangladesh-calendar month bounds as UTC instants, for Firestore range queries.
 * `monthIndex` is 0-based, matching `new Date(year, month, 1)` call sites.
 */
export function businessMonthBounds(year: number, monthIndex: number): { start: Date; end: Date } {
    const start = businessDayStart(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
    const [nextYear, nextMonthIndex] = monthIndex === 11 ? [year + 1, 0] : [year, monthIndex + 1];
    const end = new Date(businessDayStart(`${nextYear}-${String(nextMonthIndex + 1).padStart(2, '0')}-01`).getTime() - 1);
    return { start, end };
}

/** Current Bangladesh calendar day as `yyyy-MM-dd` (safe on any server timezone). */
export function currentBusinessYMD(): string {
    return toBusinessYMD(new Date()) as string;
}
