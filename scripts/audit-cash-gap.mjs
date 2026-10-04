/**
 * READ-ONLY diagnostic: reproduces the cash math of src/lib/db/account-overview.ts
 * directly against Firestore (REST API, anonymous key read — no writes anywhere)
 * and answers: why did cash show 71,066 closing 30-Jun-2026 but 22,246 "opening" 1-Jul-2026
 * for user vfpublication@gmail.com?
 *
 * Usage: node scripts/audit-cash-gap.mjs
 */

const PROJECT_ID = 'jps-archives-ac';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    || 'AIzaSyDnGiqsD67eqPkKUBtdNq1pVVTcM1myg64';
const UID = 'bj6cUuUb67ZfiFNYjZg9WNMfuca2'; // vfpublication@gmail.com

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${UID}`;

// ---- Firestore REST value decoding ----------------------------------------

function decodeValue(v) {
    if (!v) return null;
    if ('nullValue' in v) return null;
    if ('timestampValue' in v) return { __ts: v.timestampValue };
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('stringValue' in v) return v.stringValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
    if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
    return null;
}
function decodeFields(fields) {
    const out = {};
    for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
    return out;
}

async function fetchCollection(name) {
    const docs = [];
    let pageToken = null;
    do {
        const url = new URL(`${BASE}/${name}`);
        url.searchParams.set('key', API_KEY);
        url.searchParams.set('pageSize', '300');
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${await res.text()}`);
        const json = await res.json();
        for (const d of json.documents || []) {
            docs.push({ id: d.name.split('/').pop(), ...decodeFields(d.fields || {}) });
        }
        pageToken = json.nextPageToken || null;
    } while (pageToken);
    return docs;
}

// ---- app math helpers (mirror of account-overview.ts) ---------------------

const toNum = (v, fallback = 0) => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
};
const tsToDate = (d) =>
    d == null ? null : d instanceof Date ? d : new Date(d.__ts ?? d);

/** app's isBeforeOrOnCutoff: dateMillis <= cutoffMillis (cutoff = server-local EOD, passed in as absolute instant) */
const le = (d, cutoffMs) => {
    const date = tsToDate(d);
    if (!cutoffMs) return true;
    if (!date) return false;
    return date.getTime() <= cutoffMs;
};

function computeCashBank(data, cutoffMs) {
    let cash = 0, bank = 0;
    const hits = { capital: [], donations: [], sales: [], recvPayments: [], expenses: [], transfers: [] };

    for (const c of data.capital) {
        if (!(c.source === 'Initial Capital' || le(c.date, cutoffMs))) continue;
        const amt = toNum(c.amount);
        if (c.paymentMethod === 'Cash') { cash += amt; hits.capital.push([c, amt]); }
        else if (c.paymentMethod === 'Bank') { bank += amt; hits.capital.push([c, amt]); }
    }
    for (const d of data.donations) {
        if (d.source === 'Initial Capital' || d.donorName === 'Internal Transfer') continue;
        if (!le(d.date, cutoffMs)) continue;
        const amt = toNum(d.amount);
        if (d.paymentMethod === 'Cash') { cash += amt; hits.donations.push([d, amt]); }
        else if (d.paymentMethod === 'Bank') { bank += amt; hits.donations.push([d, amt]); }
    }
    for (const s of data.sales) {
        if (!le(s.date, cutoffMs)) continue;
        const total = toNum(s.total), paid = toNum(s.amountPaid);
        if (s.paymentMethod === 'Cash') { cash += total; hits.sales.push([s, total]); }
        else if (s.paymentMethod === 'Bank') { bank += total; hits.sales.push([s, total]); }
        else if (s.paymentMethod === 'Split' && paid > 0) {
            if (s.splitPaymentMethod === 'Bank') bank += paid; else cash += paid;
            hits.sales.push([s, paid]);
        }
    }
    for (const t of data.transactions) {
        if (t.type !== 'Receivable' || t.status !== 'Paid') continue;
        if (!String(t.description || '').startsWith('Payment from customer')) continue;
        if (!le(t.dueDate, cutoffMs)) continue;
        const amt = toNum(t.amount);
        if (t.paymentMethod === 'Cash') { cash += amt; hits.recvPayments.push([t, amt]); }
        else if (t.paymentMethod === 'Bank') { bank += amt; hits.recvPayments.push([t, amt]); }
    }
    for (const e of data.expenses) {
        if (!le(e.date, cutoffMs)) continue;
        const amt = toNum(e.amount);
        if (e.paymentMethod === 'Bank') { bank -= amt; hits.expenses.push([e, -amt]); }
        else { cash -= amt; hits.expenses.push([e, -amt]); }
    }
    for (const tr of data.transfers) {
        if (!le(tr.date, cutoffMs)) continue;
        const amt = toNum(tr.amount);
        let dCash = 0;
        if (tr.from === 'Cash') dCash -= amt;
        if (tr.to === 'Cash') dCash += amt;
        cash += dCash;
        hits.transfers.push([tr, dCash]);
    }
    return { cash, bank, hits };
}

// ---- pretty helpers ---------------------------------------------------------

const fmtDhaka = (d) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'medium' }).format(tsToDate(d));
const fmtUTC = (d) => tsToDate(d).toISOString();
const money = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

// cutoff "EOD of YYYY-MM-DD in tz offset" expressed as an absolute UTC instant
function eodInstant(ymd, offsetMinutes) {
    // local EOD 23:59:59.999 => UTC = local - offset
    const dayStartUtc = Date.parse(`${ymd}T00:00:00Z`) - offsetMinutes * 60_000; // local midnight in UTC ms
    return dayStartUtc + 86_399_999;
}

// ---- main -------------------------------------------------------------------

const COLLECTIONS = ['capital', 'donations', 'sales', 'expenses', 'transfers', 'transactions', 'purchases', 'sales_returns'];

console.log(`Fetching (read-only): ${COLLECTIONS.join(', ')} ...`);
const data = {};
for (const c of COLLECTIONS) data[c] = await fetchCollection(c);
for (const c of COLLECTIONS) console.log(`  ${c}: ${data[c].length} docs`);

const TZS = [
    { label: 'Asia/Dhaka (UTC+6, local dev machine)', offset: 360 },
    { label: 'UTC (typical cloud server)', offset: 0 },
    { label: 'America/Los_Angeles (UTC-7, Firebase App Hosting us-west1)', offset: -420 },
];

console.log('\n=== Reproducing the app numbers (cash as-of EOD 30-Jun vs EOD 1-Jul-2026) ===');
for (const tz of TZS) {
    const c630 = eodInstant('2026-06-30', tz.offset);
    const c701 = eodInstant('2026-07-01', tz.offset);
    const a = computeCashBank(data, c630);
    const b = computeCashBank(data, c701);
    const matches = Math.abs(a.cash - 71066) < 1 && Math.abs(b.cash - 22246) < 1;
    console.log(`\n[${tz.label}]`);
    console.log(`  cutoff 30-Jun EOD = ${new Date(c630).toISOString()}   -> cash = ${money(a.cash)}  bank = ${money(a.bank)}`);
    console.log(`  cutoff  1-Jul EOD = ${new Date(c701).toISOString()}   -> cash = ${money(b.cash)}  bank = ${money(b.bank)}`);
    console.log(`  cash gap = ${money(b.cash - a.cash)}${matches ? '   <<< MATCHES the numbers you saw (71,066 -> 22,246)' : ''}`);

    // docs that entered between the two cutoffs (these create the gap)
    const inA = new Set([
        ...a.hits.capital, ...a.hits.donations, ...a.hits.sales,
        ...a.hits.recvPayments, ...a.hits.expenses, ...a.hits.transfers,
    ].map(([, ]) => 0)); // placeholder not used
    const diff = (listA, listB) => {
        const idsA = new Set(listA.map(([d]) => d.id));
        return listB.filter(([d]) => !idsA.has(d.id));
    };
    const entered = [
        ...diff(a.hits.capital, b.hits.capital).map(([d, amt]) => ({ src: 'capital', d, amt })),
        ...diff(a.hits.donations, b.hits.donations).map(([d, amt]) => ({ src: 'donation', d, amt })),
        ...diff(a.hits.sales, b.hits.sales).map(([d, amt]) => ({ src: 'sale', d, amt })),
        ...diff(a.hits.recvPayments, b.hits.recvPayments).map(([d, amt]) => ({ src: 'receivable payment', d, amt })),
        ...diff(a.hits.expenses, b.hits.expenses).map(([d, amt]) => ({ src: 'expense', d, amt })),
        ...diff(a.hits.transfers, b.hits.transfers).map(([d, amt]) => ({ src: 'transfer', d, amt })),
    ].filter(x => x.src !== 'sale' || true);
    // only cash-affecting entries matter for the cash gap; keep all but mark
    if (entered.length) {
        console.log(`  Documents included at 1-Jul EOD but NOT at 30-Jun EOD:`);
        for (const { src, d, amt } of entered) {
            const label = d.saleId || d.expenseId || d.description || d.donorName || d.supplier || d.id;
            console.log(`    - [${src}] ${String(label).slice(0, 70)}`);
            console.log(`        stored date (UTC): ${fmtUTC(d.date ?? d.dueDate)}   | in Bangladesh calendar: ${fmtDhaka(d.date ?? d.dueDate)}`);
            console.log(`        amount: ${toNum(d.amount ?? d.total)}  method: ${d.paymentMethod || '-'}  cash effect here: ${money(amt)}`);
        }
    }
}

console.log('\n=== All transfers recorded between 25-Jun and 10-Jul-2026 (raw stored instants) ===');
for (const tr of data.transfers) {
    const t = tsToDate(tr.date).getTime();
    if (t >= Date.parse('2026-06-20T00:00:00Z') && t <= Date.parse('2026-07-15T00:00:00Z')) {
        console.log(`  transfer ${tr.id}: ${toNum(tr.amount)} BDT  ${tr.from} -> ${tr.to}`);
        console.log(`     stored (UTC): ${fmtUTC(tr.date)}  |  Bangladesh date: ${fmtDhaka(tr.date)}`);
    }
}

console.log('\n=== Sanity: any expense/sale/return/purchase dated (Bangladesh) 30-Jun..2-Jul-2026 ===');
const dhakaDay = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(tsToDate(d));
for (const coll of ['expenses', 'sales', 'sales_returns', 'purchases']) {
    for (const d of data[coll]) {
        const day = dhakaDay(d.date);
        if (day >= '2026-06-30' && day <= '2026-07-02') {
            console.log(`  [${coll}] ${day} (BD) | stored UTC ${fmtUTC(d.date)} | ${(d.description || d.supplier || d.saleId || d.purchaseId || d.id).toString().slice(0, 60)} | amount/total: ${toNum(d.amount ?? d.total)}`);
        }
    }
}
