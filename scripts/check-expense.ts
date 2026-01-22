/**
 * Debug script to dump the exact content of the 1800 Expense
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const USER_ID = 'bj6cUuUb67ZfiFNYjZg9WNMfuca2';
const EXPENSE_ID = 'BnG7SF1Z1c1G3JfZ23uT';

async function checkExpense() {
    console.log(`[CHECK] Fetching expense ID: ${EXPENSE_ID}`);
    const ref = doc(db, 'users', USER_ID, 'expenses', EXPENSE_ID);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        const data = snap.data();
        console.log('--------------------------------------------------');
        console.log('EXPENSE DATA START');
        console.log(JSON.stringify(data, null, 2));
        console.log('EXPENSE DATA END');
        console.log('--------------------------------------------------');

        const desc = data.description || '';
        console.log(`Exact Description Length: ${desc.length}`);
        console.log(`Exact Description String: "${desc}"`);
        console.log(`Starts with "Transfer to"?: ${desc.startsWith('Transfer to')}`);

    } else {
        console.log('Expense not found!');
    }
    process.exit(0);
}

checkExpense().catch(console.error);
