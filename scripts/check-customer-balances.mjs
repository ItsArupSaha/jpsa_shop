/**
 * READ-ONLY health check for stored customer balances.
 *
 * Every customer's dueBalance is recomputed from the full history using the
 * same rules the app writes with (sales dues + credit usage − payments −
 * returns) and compared against the stored value. Damage from the old
 * delete-sale credit bug (fixed 2026-10-05) shows up here as a mismatch.
 *
 * Usage: node scripts/check-customer-balances.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { config } from 'dotenv';

config({ path: '.env' });

const KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!KEY || !PROJECT) {
    console.error('Missing NEXT_PUBLIC_FIREBASE_* vars in .env');
    process.exit(1);
}

const ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

function decodeValue(v) {
    if (!v) return null;
    if ('nullValue' in v) return null;
    if ('timestampValue' in v) return { __timestamp: v.timestampValue };
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

const toNum = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : Number.isFinite(Number(v)) ? Number(v) : 0);

async function main() {
    const userDocs = await fetchDocs('users');
    const report = [];

    for (const user of userDocs) {
        const uid = user.__id;
        const [customers, sales, transactions, returns] = await Promise.all([
            fetchDocs(`users/${uid}/customers`),
            fetchDocs(`users/${uid}/sales`),
            fetchDocs(`users/${uid}/transactions`),
            fetchDocs(`users/${uid}/sales_returns`),
        ]);
        console.log(`\nUser ${uid}: ${customers.length} customers, ${sales.length} sales, ${transactions.length} transactions, ${returns.length} returns`);

        // Payments reduce the balance; refunds also create Paid Payable traces but
        // those never touch dueBalance (handled by refundCustomerOverpayment itself).
        const paymentsByCustomer = new Map();
        for (const t of transactions) {
            if (t.type !== 'Receivable' || t.status !== 'Paid') continue;
            if (!String(t.description || '').startsWith('Payment from customer')) continue;
            if (!t.customerId) continue;
            paymentsByCustomer.set(t.customerId, (paymentsByCustomer.get(t.customerId) || 0) + toNum(t.amount));
        }

        const returnsByCustomer = new Map();
        for (const r of returns) {
            returnsByCustomer.set(r.customerId, (returnsByCustomer.get(r.customerId) || 0) + toNum(r.totalReturnValue));
        }

        let mismatches = 0;
        for (const c of customers) {
            const cid = c.__id;
            let expected = toNum(c.openingBalance);

            for (const s of sales.filter(s => s.customerId === cid)) {
                const credit = toNum(s.creditApplied);
                expected += credit;
                const finalTotal = toNum(s.total) - credit;
                if (s.paymentMethod === 'Due') {
                    expected += finalTotal;
                } else if (s.paymentMethod === 'Split') {
                    expected += Math.max(finalTotal - toNum(s.amountPaid), 0);
                }
            }

            expected -= paymentsByCustomer.get(cid) || 0;
            expected -= returnsByCustomer.get(cid) || 0;

            const stored = toNum(c.dueBalance);
            if (Math.abs(expected - stored) > 0.01) {
                mismatches++;
                const row = {
                    user: uid,
                    customerId: cid,
                    customerName: c.name,
                    storedDueBalance: stored,
                    recomputedBalance: Math.round(expected * 100) / 100,
                    difference: Math.round((stored - expected) * 100) / 100,
                };
                report.push(row);
                console.log(`  MISMATCH ${c.name} (${cid}): stored ${stored} vs recomputed ${Math.round(expected * 100) / 100} (diff ${row.difference})`);
            }
        }
        if (mismatches === 0) console.log('  All customer balances match their history. ✔');
    }

    writeFileSync('balance-check-report.json', JSON.stringify(report, null, 2));
    console.log(`\n${report.length} mismatch(es) written to balance-check-report.json`);
    console.log(report.length === 0
        ? 'No repair needed.'
        : 'Review the listed customers; repairs should be applied one by one after confirmation.');
}

main().catch((e) => {
    console.error('Check failed:', e);
    process.exit(1);
});
