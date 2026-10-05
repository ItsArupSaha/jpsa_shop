/**
 * READ-ONLY full backup of the Firestore database to a local JSON file.
 * Uses the public REST API with the web API key (same read path the app uses).
 * Writes nothing to Firestore. Usage: node scripts/backup-firestore.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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

const USER_COLLECTIONS = [
    'items', 'categories', 'customers', 'sales', 'sales_returns', 'purchases',
    'expenses', 'donations', 'transactions', 'transfers', 'capital', 'packages', 'metadata',
];

async function main() {
    console.log(`Backing up project ${PROJECT} ...`);
    const backup = { project: PROJECT, exportedAt: new Date().toISOString(), users: [] };

    const userDocs = await fetchDocs('users');
    console.log(`Found ${userDocs.length} user(s).`);

    for (const user of userDocs) {
        const uid = user.__id;
        const entry = { uid, profile: user, collections: {} };
        for (const coll of USER_COLLECTIONS) {
            try {
                entry.collections[coll] = await fetchDocs(`users/${uid}/${coll}`);
                console.log(`  ${uid} / ${coll}: ${entry.collections[coll].length} docs`);
            } catch (e) {
                // Missing collection for a new user is normal; anything else is reported.
                entry.collections[coll] = { __error: String(e.message || e) };
                console.warn(`  ${uid} / ${coll}: FAILED — ${e.message}`);
            }
        }
        backup.users.push(entry);
    }

    mkdirSync('backups', { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const file = `backups/backup-${stamp}.json`;
    writeFileSync(file, JSON.stringify(backup, null, 2));
    const { statSync } = await import('node:fs');
    console.log(`\nBackup written to ${file} (${(statSync(file).size / 1024).toFixed(1)} KB)`);
}

main().catch((e) => {
    console.error('Backup failed:', e);
    process.exit(1);
});
