/**
 * Debug script to compare balance calculations at different dates
 * to find where the 1800 TK discrepancy originates
 */

import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore, Timestamp } from 'firebase/firestore';

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

let outputBuffer: string[] = [];

function log(msg: string) {
    outputBuffer.push(msg);
    console.log(msg);
}

function formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toISOString().split('T')[0];
}

function isBeforeOrOn(date: any, cutoff: Date): boolean {
    if (!date) return false;
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d <= cutoff;
}

async function analyzeBalances() {
    log('='.repeat(80));
    log('BALANCE CALCULATION COMPARISON');
    log('='.repeat(80));

    // Fetch all data
    const [salesSnap, expensesSnap, transactionsSnap, capitalSnap, donationsSnap, transfersSnap] = await Promise.all([
        getDocs(collection(db, 'users', USER_ID, 'sales')),
        getDocs(collection(db, 'users', USER_ID, 'expenses')),
        getDocs(collection(db, 'users', USER_ID, 'transactions')),
        getDocs(collection(db, 'users', USER_ID, 'capital')),
        getDocs(collection(db, 'users', USER_ID, 'donations')),
        getDocs(collection(db, 'users', USER_ID, 'transfers')),
    ]);

    const allSales: any[] = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allExpenses: any[] = expensesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allTransactions: any[] = transactionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allCapital: any[] = capitalSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allDonations: any[] = donationsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allTransfers: any[] = transfersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Calculate cash balance as of a specific date (same logic as account-overview.ts)
    function calculateCash(asOfDate: Date): { cash: number; details: string[] } {
        const details: string[] = [];
        let cash = 0;

        // Filter data
        const filteredCapital = allCapital.filter(c => c.source === 'Initial Capital' || isBeforeOrOn(c.date, asOfDate));
        const filteredDonations = allDonations.filter(d => isBeforeOrOn(d.date, asOfDate));
        const filteredSales = allSales.filter(s => isBeforeOrOn(s.date, asOfDate));
        const filteredExpenses = allExpenses.filter(e => isBeforeOrOn(e.date, asOfDate));
        const filteredTransfers = allTransfers.filter(t => isBeforeOrOn(t.date, asOfDate));
        const paidTransactions = allTransactions.filter(t =>
            isBeforeOrOn(t.dueDate, asOfDate) && t.status === 'Paid'
        );

        // Capital (Cash)
        let capitalCash = 0;
        filteredCapital.forEach(c => {
            if (c.paymentMethod === 'Cash') {
                capitalCash += c.amount;
                details.push(`  Capital: +${c.amount} (${c.source || 'Unknown'}, ${formatDate(c.date)})`);
            }
        });
        cash += capitalCash;

        // Donations (Cash)
        let donationsCash = 0;
        filteredDonations.forEach(d => {
            if (d.source !== 'Initial Capital' && d.donorName !== 'Internal Transfer' && d.paymentMethod === 'Cash') {
                donationsCash += d.amount;
                details.push(`  Donation: +${d.amount} (${d.donorName}, ${formatDate(d.date)})`);
            }
        });
        cash += donationsCash;

        // Sales (Cash/Split)
        let salesCash = 0;
        filteredSales.forEach(s => {
            if (s.paymentMethod === 'Cash') {
                salesCash += s.total;
                details.push(`  Sale: +${s.total} (Cash, ${formatDate(s.date)})`);
            } else if (s.paymentMethod === 'Split' && s.splitPaymentMethod === 'Cash' && s.amountPaid > 0) {
                salesCash += s.amountPaid;
                details.push(`  Sale: +${s.amountPaid} (Split-Cash, ${formatDate(s.date)})`);
            }
        });
        cash += salesCash;

        // Due Payments (Payment from customer - Cash)
        let duePaymentsCash = 0;
        paidTransactions.forEach(t => {
            if (t.type === 'Receivable' && t.description?.startsWith('Payment from customer') && t.paymentMethod === 'Cash') {
                duePaymentsCash += t.amount;
                details.push(`  DuePayment: +${t.amount} (${formatDate(t.dueDate)}, TxID: ${t.id.substring(0, 8)}...)`);
            }
        });
        cash += duePaymentsCash;

        // Expenses (Cash)
        let expensesCash = 0;
        filteredExpenses.forEach(e => {
            if (e.paymentMethod !== 'Bank') {
                expensesCash += e.amount;
                details.push(`  Expense: -${e.amount} (${e.category || 'Unknown'}, ${formatDate(e.date)})`);
            }
        });
        cash -= expensesCash;

        // Transfers affecting cash
        let transfersNet = 0;
        filteredTransfers.forEach(t => {
            if (t.from === 'Cash') {
                transfersNet -= t.amount;
                details.push(`  Transfer Out: -${t.amount} (Cash -> ${t.to}, ${formatDate(t.date)})`);
            }
            if (t.to === 'Cash') {
                transfersNet += t.amount;
                details.push(`  Transfer In: +${t.amount} (${t.from} -> Cash, ${formatDate(t.date)})`);
            }
        });
        cash += transfersNet;

        return { cash, details };
    }

    // Calculate for different dates
    const nov30 = new Date('2025-11-30T23:59:59');
    const dec31 = new Date('2025-12-31T23:59:59');

    log('\n1. BALANCE AS OF NOVEMBER 30, 2025 (Expected opening for December)');
    log('-'.repeat(80));
    const nov30Result = calculateCash(nov30);
    log(`   CALCULATED CASH: ${nov30Result.cash} TK`);
    log(`   EXPECTED (user said): 34,891 TK`);
    log(`   DIFFERENCE: ${nov30Result.cash - 34891} TK`);

    log('\n   Transaction details:');
    nov30Result.details.forEach(d => log(d));

    log('\n2. BALANCE AS OF DECEMBER 31, 2025');
    log('-'.repeat(80));
    const dec31Result = calculateCash(dec31);
    log(`   CALCULATED CASH: ${dec31Result.cash} TK`);
    log(`   APP SHOWS: 66,991 TK`);
    log(`   EXPECTED: 65,191 TK`);
    log(`   DIFFERENCE FROM EXPECTED: ${dec31Result.cash - 65191} TK`);

    log('\n3. DECEMBER-ONLY CHANGES');
    log('-'.repeat(80));
    const decemberChange = dec31Result.cash - nov30Result.cash;
    log(`   Change from Nov 30 to Dec 31: ${decemberChange} TK`);
    log(`   Expected December change: +30,300 TK (160 + 47770 + 2000 - 19630)`);
    log(`   Difference: ${decemberChange - 30300} TK`);

    log('\n4. ROOT CAUSE ANALYSIS');
    log('-'.repeat(80));
    if (nov30Result.cash !== 34891) {
        log(`   The November 30 balance (${nov30Result.cash}) doesn't match the expected ${34891}!`);
        log(`   This means the historical calculation differs from your expected opening balance.`);
        log(`   The discrepancy of ${nov30Result.cash - 34891} TK is in HISTORICAL data, not December.`);
    } else {
        log(`   November 30 balance matches. December calculation has an issue.`);
    }

    // Write output to file
    const outputPath = './scripts/balance-comparison.log';
    fs.writeFileSync(outputPath, outputBuffer.join('\n'));
    console.log(`\n\nOutput saved to: ${outputPath}`);

    process.exit(0);
}

analyzeBalances().catch(console.error);
