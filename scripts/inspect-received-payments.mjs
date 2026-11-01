/**
 * READ-ONLY replay of getPaidReceivablesForDateRange (src/lib/db/transactions.ts)
 * against live Firestore, to verify what the "Received Payments Report" download
 * includes for a given range and whether any stored dates look wrong.
 * Writes nothing. Usage: node scripts/inspect-received-payments.mjs [fromYMD] [toYMD]
 */
import { config } from 'dotenv';

config({ path: '.env' });

const KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!KEY || !PROJECT) {
    console.error('Missing NEXT_PUBLIC_FIREBASE_* vars in .env');
    process.exit(1);
}
const UID = 'bj6cUuUb67ZfiFNYjZg9WNMfuca2'; // vfpublication@gmail.com
const ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const OFFSET_MS = 6 * 60 * 60 * 1000;

// toBusinessYMD equivalent: business (UTC+6) calendar day of an instant
function businessYMD(ms) {
    return new Date(ms + OFFSET_MS).toISOString().slice(0, 10);
}
// what date-fns format(new Date(iso)) shows in a Asia/Dhaka (+6, no DST) browser
function dhakaDisplayYMD(ms) {
    return businessYMD(ms); // same fixed offset -> identical day
}

function decodeValue(v) {
    if (!v) return null;
    if ('nullValue' in v) return null;
    if ('timestampValue' in v) return v.timestampValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('stringValue' in v) return v.stringValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
    if ('mapValue' in v) {
        const o = {};
        for (const [k, vv] of Object.entries(v.mapValue.fields || {})) o[k] = decodeValue(vv);
        return o;
    }
    return null;
}

async function fetchDocs(path) {
    const docs = [];
    let pageToken = null;
    do {
        const url = new URL(`${ROOT}/${path}`);
        url.searchParams.set('key', KEY);
        url.searchParams.set('pageSize', '300');
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${await res.text()}`);
        const json = await res.json();
        for (const d of json.documents || []) {
            const o = { __id: d.name.split('/').pop() };
            for (const [k, v] of Object.entries(d.fields || {})) o[k] = decodeValue(v);
            docs.push(o);
        }
        pageToken = json.nextPageToken || null;
    } while (pageToken);
    return docs;
}

const [fromArg, toArg] = process.argv.slice(2);
const fromYMD = fromArg || '2026-10-01';
const toYMD = toArg || fromArg || '2026-10-31';

const [transactions, customers] = await Promise.all([
    fetchDocs(`users/${UID}/transactions`),
    fetchDocs(`users/${UID}/customers`),
]);
const customerName = Object.fromEntries(customers.map(c => [c.__id, c.name]));

// Exact same visibility rule as getPaidReceivablesForDateRange
const paidReceivables = transactions.filter(t => t.type === 'Receivable' && t.status === 'Paid');
const hiddenCount = paidReceivables.filter(t => t.isHiddenFromHistory || t.saleId).length;
const visible = paidReceivables.filter(t => !t.isHiddenFromHistory && !t.saleId);

console.log(`Paid Receivable docs: ${paidReceivables.length} (hidden/sale-linked excluded: ${hiddenCount}, visible payment rows: ${visible.length})`);

const rows = visible.map(t => {
    const iso = typeof t.dueDate === 'string' ? t.dueDate : String(t.dueDate);
    const ms = Date.parse(iso);
    return {
        id: t.__id,
        ms,
        iso,
        bizDay: businessYMD(ms),
        displayDay: dhakaDisplayYMD(ms),
        timeUTC: iso.slice(11, 19),
        amount: t.amount,
        method: t.paymentMethod,
        customer: customerName[t.customerId] || t.customerId || 'N/A',
        desc: t.description,
        hiddenFlag: t.isHiddenFromHistory === true,
        hasSaleId: t.saleId != null,
    };
}).sort((a, b) => a.ms - b.ms);

// Anomaly scan over ALL visible payment rows
const anomalies = rows.filter(r =>
    !Number.isFinite(r.ms) ||
    r.timeUTC === '18:00:00' || r.timeUTC === '18:00:00.000' || // exact Dhaka midnight -> a "dated" record, not a real instant
    r.bizDay !== r.displayDay
);
console.log(`\nAnomalous rows (unparseable / exact Dhaka-midnight / display-vs-filter mismatch): ${anomalies.length}`);
for (const r of anomalies) console.log(JSON.stringify(r));

// The download for the requested range
const inRange = rows.filter(r => r.bizDay >= fromYMD && r.bizDay <= toYMD);
console.log(`\n=== Download for range ${fromYMD} .. ${toYMD}: ${inRange.length} rows, total ${inRange.reduce((s, r) => s + r.amount, 0)} ===`);
for (const r of inRange) {
    console.log(`${r.bizDay} | stored ${r.iso} | shows as ${r.displayDay} | ${r.customer} | ${r.method} | ${r.amount}`);
}

// Neighbors just outside the range (what the user might expect to see inside)
const before = rows.filter(r => r.bizDay < fromYMD).slice(-5);
const after = rows.filter(r => r.bizDay > toYMD).slice(0, 5);
if (before.length) {
    console.log(`\nLast rows BEFORE ${fromYMD}:`);
    for (const r of before) console.log(`${r.bizDay} | stored ${r.iso} | ${r.customer} | ${r.amount}`);
}
if (after.length) {
    console.log(`\nFirst rows AFTER ${toYMD}:`);
    for (const r of after) console.log(`${r.bizDay} | stored ${r.iso} | ${r.customer} | ${r.amount}`);
}
