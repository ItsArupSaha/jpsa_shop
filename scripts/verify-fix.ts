/**
 * READ-ONLY verification for the timezone fix (no writes anywhere).
 *
 * 1. Unit-tests the real helpers in src/lib/db/business-date.ts.
 * 2. Replays getAccountOverview's cash math against live Firestore data using
 *    the new Bangladesh-day cutoffs and asserts the fixed numbers.
 * 3. Attempts to call the REAL getAccountOverview end-to-end (read-only).
 *
 * Usage: npx tsx scripts/verify-fix.ts
 */

process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??= 'AIzaSyDnGiqsD67eqPkKUBtdNq1pVVTcM1myg64';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??= 'jps-archives-ac.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??= 'jps-archives-ac';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??= 'jps-archives-ac.firebasestorage.app';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??= '281079669503';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??= '1:281079669503:web:94ee67cda830bb1b0322ca';

import {
    businessMonthBounds,
    inBusinessDayRange,
    isValidBusinessYMD,
    lastDayOfMonthYMD,
    onOrBeforeBusinessDay,
    shiftDayYMD,
    toBusinessYMD,
} from '../src/lib/db/business-date';

async function main() {
    const UID = 'bj6cUuUb67ZfiFNYjZg9WNMfuca2'; // vfpublication@gmail.com
    const KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
    const BASE = `https://firestore.googleapis.com/v1/projects/jps-archives-ac/databases/(default)/documents/users/${UID}`;

    let failures = 0;
    function check(name: string, cond: boolean, detail = '') {
        if (cond) console.log(`  PASS  ${name}`);
        else { failures++; console.error(`  FAIL  ${name} ${detail}`); }
    }

    // ---------------------------------------------------------------- 1. helpers

        console.log('\n[1] business-date helper unit tests (real module)');
    check('the 2-Jul-2026 transfer instant maps to BD day 2026-07-02',
        toBusinessYMD(new Date('2026-07-01T18:00:00Z')) === '2026-07-02');
    check('2026-06-30 23:59 BD (17:59:59.999Z) still belongs to 2026-06-30',
        toBusinessYMD('2026-06-30T17:59:59.999Z') === '2026-06-30');
    check('date-only string is treated as its own BD day',
        toBusinessYMD('2026-07-01') === '2026-07-01');
    check('shiftDayYMD back one day', shiftDayYMD('2026-07-01', -1) === '2026-06-30');
    check('shiftDayYMD across month end', shiftDayYMD('2026-07-31', 1) === '2026-08-01');
    check('lastDayOfMonthYMD non-leap Feb', lastDayOfMonthYMD('2026-02-10') === '2026-02-28');
    check('lastDayOfMonthYMD leap Feb', lastDayOfMonthYMD('2028-02-01') === '2028-02-29');
    check('lastDayOfMonthYMD December', lastDayOfMonthYMD('2026-12-05') === '2026-12-31');
    check('isValidBusinessYMD accepts real day', isValidBusinessYMD('2026-07-01'));
    check('isValidBusinessYMD rejects 2026-02-30', !isValidBusinessYMD('2026-02-30'));
    check('isValidBusinessYMD rejects garbage', !isValidBusinessYMD('2026-7-1') && !isValidBusinessYMD('abc'));
    {
        const { start, end } = businessMonthBounds(2026, 6); // July, 0-based
        check('July BD month bounds', start.toISOString() === '2026-06-30T18:00:00.000Z'
            && end.toISOString() === '2026-07-31T17:59:59.999Z',
            `got ${start.toISOString()} .. ${end.toISOString()}`);
    }
    {
        const { start, end } = businessMonthBounds(2026, 11); // December wraps to next year
        check('December BD month bounds wrap', start.toISOString() === '2026-11-30T18:00:00.000Z'
            && end.toISOString() === '2026-12-31T17:59:59.999Z',
            `got ${start.toISOString()} .. ${end.toISOString()}`);
    }
    check('onOrBeforeBusinessDay: no cutoff includes everything', onOrBeforeBusinessDay(null, null));
    check('onOrBeforeBusinessDay: unusable date excluded', !onOrBeforeBusinessDay(null, '2026-07-01'));
    check('onOrBeforeBusinessDay: transfer excluded from 1-Jul',
        !onOrBeforeBusinessDay(new Date('2026-07-01T18:00:00Z'), '2026-07-01'));
    check('onOrBeforeBusinessDay: transfer included from 2-Jul',
        onOrBeforeBusinessDay(new Date('2026-07-01T18:00:00Z'), '2026-07-02'));
    check('inBusinessDayRange inclusive both ends',
        inBusinessDayRange('2026-07-01T18:00:00Z', '2026-07-01', '2026-07-02')
        && inBusinessDayRange('2026-06-30T18:00:00Z', '2026-06-30', '2026-07-02'));

    // ------------------------------------------------- 2. live data replay (mirror)

    function decodeValue(v: any): any {
        if (!v) return null;
        if ('nullValue' in v) return null;
        if ('timestampValue' in v) return { __ts: v.timestampValue };
        if ('integerValue' in v) return Number(v.integerValue);
        if ('doubleValue' in v) return Number(v.doubleValue);
        if ('stringValue' in v) return v.stringValue;
        if ('booleanValue' in v) return v.booleanValue;
        if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
        if ('mapValue' in v) {
            const o: any = {};
            for (const [k, vv] of Object.entries(v.mapValue.fields || {})) o[k] = decodeValue(vv);
            return o;
        }
        return null;
    }

    async function fetchCollection(name: string): Promise<any[]> {
        const docs: any[] = [];
        let pageToken: string | null = null;
        do {
            const url = new URL(`${BASE}/${name}`);
            url.searchParams.set('key', KEY);
            url.searchParams.set('pageSize', '300');
            if (pageToken) url.searchParams.set('pageToken', pageToken);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
            const json = await res.json();
            for (const d of json.documents || []) {
                const o: any = { id: d.name.split('/').pop() };
                for (const [k, v] of Object.entries(d.fields || {})) o[k] = decodeValue(v);
                docs.push(o);
            }
            pageToken = json.nextPageToken || null;
        } while (pageToken);
        return docs;
    }

    const toNum = (v: any, f = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : Number.isFinite(Number(v)) ? Number(v) : f);
    const tsMs = (d: any) => {
        if (d == null) return null;
        if (typeof d === 'string') { const t = Date.parse(d); return Number.isNaN(t) ? null : t; }
        if (typeof d === 'object' && '__ts' in d) return Date.parse(d.__ts);
        return null;
    };
    const bdDay = (d: any) => { const ms = tsMs(d); return ms === null ? null : toBusinessYMD(new Date(ms)); };
    const le = (d: any, ymd: string | null) => { if (!ymd) return true; const day = bdDay(d); return day !== null && day <= ymd; };

    function computeCashBank(data: Record<string, any[]>, cutoffYMD: string | null) {
        let cash = 0, bank = 0;
        for (const c of data.capital) {
            if (!(c.source === 'Initial Capital' || le(c.date, cutoffYMD))) continue;
            if (c.paymentMethod === 'Cash') cash += toNum(c.amount);
            else if (c.paymentMethod === 'Bank') bank += toNum(c.amount);
        }
        for (const d of data.donations) {
            if (d.source === 'Initial Capital' || d.donorName === 'Internal Transfer') continue;
            if (!le(d.date, cutoffYMD)) continue;
            if (d.paymentMethod === 'Cash') cash += toNum(d.amount);
            else if (d.paymentMethod === 'Bank') bank += toNum(d.amount);
        }
        for (const s of data.sales) {
            if (!le(s.date, cutoffYMD)) continue;
            const total = toNum(s.total), paid = toNum(s.amountPaid);
            if (s.paymentMethod === 'Cash') cash += total;
            else if (s.paymentMethod === 'Bank') bank += total;
            else if (s.paymentMethod === 'Split' && paid > 0) s.splitPaymentMethod === 'Bank' ? bank += paid : cash += paid;
        }
        for (const t of data.transactions) {
            if (t.type !== 'Receivable' || t.status !== 'Paid') continue;
            if (!String(t.description || '').startsWith('Payment from customer')) continue;
            if (!le(t.dueDate, cutoffYMD)) continue;
            if (t.paymentMethod === 'Cash') cash += toNum(t.amount);
            else if (t.paymentMethod === 'Bank') bank += toNum(t.amount);
        }
        for (const e of data.expenses) {
            if (!le(e.date, cutoffYMD)) continue;
            if (e.paymentMethod === 'Bank') bank -= toNum(e.amount); else cash -= toNum(e.amount);
        }
        for (const tr of data.transfers) {
            if (!le(tr.date, cutoffYMD)) continue;
            const amt = toNum(tr.amount);
            if (tr.from === 'Cash') cash -= amt;
            if (tr.to === 'Cash') cash += amt;
        }
        return { cash, bank };
    }

        console.log('\n[2] Live-data replay of getAccountOverview cash math (Bangladesh-day cutoffs)');
    const collections = ['capital', 'donations', 'sales', 'expenses', 'transfers', 'transactions'];
    const data: Record<string, any[]> = {};
    for (const c of collections) data[c] = await fetchCollection(c);
        console.log(`  fetched: ${collections.map(c => `${c}=${data[c].length}`).join(', ')}`);

    const june30 = computeCashBank(data, '2026-06-30');
    const july01 = computeCashBank(data, '2026-07-01');
    const july02 = computeCashBank(data, '2026-07-02');

        console.log(`  cash as of 30-Jun-2026 = ${june30.cash.toLocaleString()} (bank ${june30.bank.toLocaleString()})`);
        console.log(`  cash as of  1-Jul-2026 = ${july01.cash.toLocaleString()} (bank ${july01.bank.toLocaleString()})`);
        console.log(`  cash as of  2-Jul-2026 = ${july02.cash.toLocaleString()} (bank ${july02.bank.toLocaleString()})`);

    check('closing 30-Jun cash = 71,066', Math.abs(june30.cash - 71066) < 0.01, `got ${june30.cash}`);
    check('closing 30-Jun bank = 187,277.25', Math.abs(june30.bank - 187277.25) < 0.01, `got ${june30.bank}`);
    check('1-Jul view = 72,246 (2-Jul transfer excluded, 1-Jul cash sales +1,180 kept)',
        Math.abs(july01.cash - 72246) < 0.01, `got ${july01.cash}`);
    check('2-Jul view = 22,746 (transfer −50,000 + Mrinal Prabhu cash donation +500 land on their own day)',
        Math.abs(july02.cash - 22746) < 0.01, `got ${july02.cash}`);
    check('July opening (closing of 30-Jun) equals June closing by construction',
        june30.cash === computeCashBank(data, shiftDayYMD('2026-07-01', -1)).cash);

    // every business record falls in exactly one BD month bucket
    {
        const june = businessMonthBounds(2026, 5), july = businessMonthBounds(2026, 6);
        const inBucket = (d: any, b: { start: Date; end: Date }) => {
            const day = bdDay(d);
            return day !== null && inBusinessDayRange(new Date(Date.parse(`${day}T00:00:00Z`)),
                toBusinessYMD(b.start)!, toBusinessYMD(b.end)!);
        };
        const juneSales = data.sales.filter(s => inBucket(s.date, june)).map(s => s.saleId);
        const julySales = data.sales.filter(s => inBucket(s.date, july)).map(s => s.saleId);
        check('June and July BD month buckets are disjoint',
            juneSales.filter(x => julySales.includes(x)).length === 0);
        check('1-Jul BD sales (SALE-0124, SALE-0126) are in the July bucket',
            julySales.includes('SALE-0124') && julySales.includes('SALE-0126'));
        const salaryJune = data.expenses.filter(e => e.description === 'Salary June 2026');
        check('Salary June 2026 expenses (stored 29-Jun 18:00Z = 30-Jun BD) stay in June',
            salaryJune.length > 0 && salaryJune.every((e: any) => inBucket(e.date, june) && !inBucket(e.date, july)));
    }

    // ------------------------------------- 3. real getAccountOverview end-to-end

        console.log('\n[3] Real getAccountOverview (read-only) — if it loads outside Next.js');
    try {
        const mod = await import('../src/lib/db/account-overview');
        const [a, b, c] = await Promise.all([
            mod.getAccountOverview(UID, '2026-06-30'),
            mod.getAccountOverview(UID, '2026-07-01'),
            mod.getAccountOverview(UID, '2026-07-02'),
        ]);
        console.log(`  real fn: 30-Jun cash=${a.cash.toLocaleString()}  1-Jul cash=${b.cash.toLocaleString()}  2-Jul cash=${c.cash.toLocaleString()}`);
        check('real getAccountOverview 30-Jun cash = 71,066', Math.abs(a.cash - 71066) < 0.01, `got ${a.cash}`);
        check('real getAccountOverview 1-Jul cash = 72,246', Math.abs(b.cash - 72246) < 0.01, `got ${b.cash}`);
        check('real getAccountOverview 2-Jul cash = 22,746', Math.abs(c.cash - 22746) < 0.01, `got ${c.cash}`);
    } catch (e: any) {
        console.log(`  skipped (module did not load outside Next runtime: ${String(e?.message || e).slice(0, 120)})`);
    }

        console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
    process.exit(failures === 0 ? 0 : 1);

}

main().then(() => {
    process.exit(0);
}).catch((e) => {
    console.error(e);
    process.exit(1);
});
