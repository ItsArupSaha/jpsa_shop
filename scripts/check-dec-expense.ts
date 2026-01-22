/**
 * Debug script to check the Dec 31 Expense time
 */

import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
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
const EXPENSE_ID = 'BZLFj4QLKEGBgUhhwrY7';

async function checkExpense() {
    let log = '';
    const print = (msg: string) => {
        console.log(msg);
        log += msg + '\n';
    };

    print(`[CHECK] Fetching Dec 31 expense ID: ${EXPENSE_ID}`);
    const ref = doc(db, 'users', USER_ID, 'expenses', EXPENSE_ID);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        const data = snap.data();
        print('--------------------------------------------------');
        print('EXPENSE DATA START');
        print(JSON.stringify(data, null, 2));

        const date = data.date.toDate();
        print(`\nExact Date Object: ${date.toString()}`);
        print(`Exact ISO String:  ${date.toISOString()}`);
        print(`Hours: ${date.getHours()}`);
        print(`Minutes: ${date.getMinutes()}`);
        print('--------------------------------------------------');

    } else {
        print('Expense not found!');
    }

    fs.writeFileSync('./scripts/dec-expense.log', log);
    process.exit(0);
}

checkExpense().catch(console.error);
