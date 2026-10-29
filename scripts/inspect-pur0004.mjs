/**
 * READ-ONLY inspection of PUR-0004 live state for the vfpublication user:
 * the purchase document, its payables, settlement traces, and expenses.
 * Writes nothing. Usage: node scripts/inspect-pur0004.mjs
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

const purchases = await fetchDocs(`users/${UID}/purchases`);
const pur = purchases.find(p => p.purchaseId === 'PUR-0004');
console.log('=== PUR-0004 purchase doc ===');
console.log(JSON.stringify(pur, null, 1));

const transactions = await fetchDocs(`users/${UID}/transactions`);
console.log('=== Payable transactions referencing PUR-0004 ===');
for (const t of transactions) {
    if (t.type !== 'Payable') continue;
    const desc = String(t.description || '');
    if (desc.includes('PUR-0004')) {
        console.log(JSON.stringify({ id: t.__id, desc, amount: t.amount, status: t.status, isHiddenFromHistory: t.isHiddenFromHistory, dueDate: t.dueDate }));
    }
}

const expenses = await fetchDocs(`users/${UID}/expenses`);
console.log('=== Expenses referencing PUR-0004 ===');
for (const e of expenses) {
    if (String(e.description || '').includes('PUR-0004')) {
        console.log(JSON.stringify({ id: e.__id, expenseId: e.expenseId, desc: e.description, amount: e.amount, method: e.paymentMethod, date: e.date }));
    }
}
