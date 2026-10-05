/**
 * READ-ONLY: reproduce the dashboard's October profit math against live data
 * to explain why a 100%-discount (gift) sale inflates the shown profit.
 * Usage: node scripts/check-october-profit.mjs
 */
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';

config({ path: '.env' });

const KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const UID = 'bj6cUuUb67ZfiFNYjZg9WNMfuca2';
const ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const TZ = 6 * 3600 * 1000;

function decodeValue(v) {
    if (!v) return null;
    if ('nullValue' in v) return null;
    if ('timestampValue' in v) return { __ts: v.timestampValue };
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
        if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
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

const toNum = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const bdYMD = (d) => {
    const ms = d == null ? null : typeof d === 'string' ? Date.parse(d) : d.__ts ? Date.parse(d.__ts) : null;
    return ms === null || Number.isNaN(ms) ? null : new Date(ms + TZ).toISOString().slice(0, 10);
};

async function main() {
    const [sales, items, expenses, returns] = await Promise.all([
        fetchDocs(`users/${UID}/sales`),
        fetchDocs(`users/${UID}/items`),
        fetchDocs(`users/${UID}/expenses`),
        fetchDocs(`users/${UID}/sales_returns`),
    ]);

    const octSales = sales.filter(s => (bdYMD(s.date) || '').startsWith('2026-10'));
    const octExpenses = expenses.filter(e => (bdYMD(e.date) || '').startsWith('2026-10'));
    const octReturns = returns.filter(r => (bdYMD(r.date) || '').startsWith('2026-10'));

    console.log(`October sales: ${octSales.length}, expenses: ${octExpenses.length}, returns: ${octReturns.length}\n`);

    let monthlySalesValue = 0;
    let grossProfitOldFormula = 0;   // dashboard fallback: sum (item.price - currentCost)*qty  ← ignores discount
    let grossProfitCorrect = 0;      // sale.total - cost                               ← discount-aware

    for (const s of octSales) {
        const storedCost = toNum(s.productionCost);
        const perItemStored = (s.items || []).reduce((acc, i) => acc + toNum(i.cost) * toNum(i.quantity), 0);
        const hasStored = toNum(s.productionCost) !== 0 || (s.items || []).some(i => toNum(i.cost) !== 0);

        const currentCost = (s.items || []).reduce((acc, i) => {
            const item = items.find(it => it.__id === i.itemId);
            return acc + (item ? toNum(item.productionPrice) * toNum(i.quantity) : 0);
        }, 0);

        // old dashboard formula (fallback branch, discount-blind)
        const oldMargin = (s.items || []).reduce((acc, i) => {
            const item = items.find(it => it.__id === i.itemId);
            return acc + (item ? (toNum(i.price) - toNum(item.productionPrice)) * toNum(i.quantity) : 0);
        }, 0);

        // correct formula
        const correct = hasStored && (toNum(s.productionCost) > 0 || perItemStored > 0 || toNum(s.total) >= 0)
            ? s.total - (toNum(s.productionCost) || perItemStored)
            : s.total - currentCost;

        monthlySalesValue += toNum(s.total);
        grossProfitOldFormula += oldMargin;
        grossProfitCorrect += correct;

        console.log(`${s.saleId}: total=${toNum(s.total)} subtotal=${toNum(s.subtotal)} discount=${toNum(s.discountValue)}(${s.discountType}) method=${s.paymentMethod} storedCost=${hasStored ? (toNum(s.productionCost) || perItemStored) : 'none'}`);
        console.log(`   old-formula margin: ${Math.round(oldMargin * 100) / 100}   correct profit: ${Math.round(correct * 100) / 100}`);
    }

    const expTotal = octExpenses.reduce((a, e) => a + toNum(e.amount), 0);
    const retTotal = octReturns.reduce((a, r) => a + toNum(r.totalReturnValue), 0);

    console.log(`\nMonthly sales value: ${monthlySalesValue}`);
    console.log(`Gross profit (old, discount-blind): ${Math.round(grossProfitOldFormula * 100) / 100}`);
    console.log(`Gross profit (correct):             ${Math.round(grossProfitCorrect * 100) / 100}`);
    console.log(`Expenses: ${expTotal}, returns: ${retTotal}`);
    console.log(`Dashboard net profit today would be: old=${Math.round((grossProfitOldFormula - expTotal) * 100) / 100}  correct=${Math.round((grossProfitCorrect - expTotal) * 100) / 100}`);
}

main().catch(e => { console.error(e); process.exit(1); });
