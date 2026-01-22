/**
 * Debug script to analyze cash balance discrepancy
 * 
 * Expected cash balance: 65,191 TK
 * Actual (app shows): 66,991 TK  
 * Discrepancy: +1,800 TK
 * 
 * This script will analyze all transactions for December 2025 to find the source.
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

// December 2025 date range
const DECEMBER_START = new Date('2025-12-01T00:00:00');
const DECEMBER_END = new Date('2025-12-31T23:59:59');

// Opening cash balance on Dec 1st
const OPENING_CASH = 34891;

// Expected values from the monthly report (screenshot)
const EXPECTED_VALUES = {
    cashSales: 160,
    duePaymentsCash: 47770,
    donationsCash: 2000,
    expensesCash: 19630,
};

// Output buffer for writing to file
let outputBuffer: string[] = [];

function log(msg: string) {
    outputBuffer.push(msg);
    console.log(msg);
}

function isInDecember(date: any): boolean {
    if (!date) return false;
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d >= DECEMBER_START && d <= DECEMBER_END;
}

function formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
}

async function analyzeData() {
    log('='.repeat(80));
    log('CASH BALANCE DISCREPANCY ANALYSIS');
    log('='.repeat(80));
    log(`\nUser ID: ${USER_ID}`);
    log(`Date Range: December 1-31, 2025`);
    log(`Opening Cash Balance: ${OPENING_CASH} TK`);
    log('\n');

    // Fetch all relevant data
    const [salesSnap, expensesSnap, transactionsSnap, capitalSnap, donationsSnap, transfersSnap] = await Promise.all([
        getDocs(collection(db, 'users', USER_ID, 'sales')),
        getDocs(collection(db, 'users', USER_ID, 'expenses')),
        getDocs(collection(db, 'users', USER_ID, 'transactions')),
        getDocs(collection(db, 'users', USER_ID, 'capital')),
        getDocs(collection(db, 'users', USER_ID, 'donations')),
        getDocs(collection(db, 'users', USER_ID, 'transfers')),
    ]);

    const allSales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allExpenses = expensesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allTransactions = transactionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allCapital = capitalSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allDonations = donationsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allTransfers = transfersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // ========== ANALYZE DECEMBER SALES ==========
    log('-'.repeat(80));
    log('1. DECEMBER SALES (Cash only)');
    log('-'.repeat(80));

    const decemberSales = allSales.filter((s: any) => isInDecember(s.date));
    let salesCashTotal = 0;

    decemberSales.forEach((sale: any) => {
        let cashAmount = 0;

        if (sale.paymentMethod === 'Cash') {
            cashAmount = sale.total;
        } else if (sale.paymentMethod === 'Split' && sale.splitPaymentMethod === 'Cash') {
            cashAmount = sale.amountPaid || 0;
        }

        if (cashAmount > 0) {
            log(`  [${formatDate(sale.date)}] Sale ID: ${sale.id}, Method: ${sale.paymentMethod}, Total: ${sale.total}, Cash: ${cashAmount}`);
            salesCashTotal += cashAmount;
        }
    });

    log(`\n  TOTAL CASH SALES: ${salesCashTotal} TK`);
    log(`  EXPECTED: ${EXPECTED_VALUES.cashSales} TK`);
    log(`  DIFFERENCE: ${salesCashTotal - EXPECTED_VALUES.cashSales} TK ${salesCashTotal !== EXPECTED_VALUES.cashSales ? '!!MISMATCH!!' : 'OK'}`);

    // ========== ANALYZE DECEMBER DUE PAYMENTS ==========
    log('\n' + '-'.repeat(80));
    log('2. DECEMBER DUE PAYMENTS (Cash only)');
    log('-'.repeat(80));

    const decemberPaidTransactions = allTransactions.filter((t: any) =>
        isInDecember(t.dueDate) && t.status === 'Paid' && t.type === 'Receivable'
    );

    let duePaymentsCashTotal = 0;

    decemberPaidTransactions.forEach((t: any) => {
        const desc = t.description || '';
        if (desc.startsWith('Payment from customer') && t.paymentMethod === 'Cash') {
            log(`  [${formatDate(t.dueDate)}] ID: ${t.id}, Amount: ${t.amount}, Desc: ${desc.substring(0, 50)}...`);
            duePaymentsCashTotal += t.amount;
        }
    });

    log(`\n  TOTAL DUE PAYMENTS (Cash): ${duePaymentsCashTotal} TK`);
    log(`  EXPECTED: ${EXPECTED_VALUES.duePaymentsCash} TK`);
    log(`  DIFFERENCE: ${duePaymentsCashTotal - EXPECTED_VALUES.duePaymentsCash} TK ${duePaymentsCashTotal !== EXPECTED_VALUES.duePaymentsCash ? '!!MISMATCH!!' : 'OK'}`);

    // ========== ANALYZE DECEMBER DONATIONS ==========
    log('\n' + '-'.repeat(80));
    log('3. DECEMBER DONATIONS (Cash only)');
    log('-'.repeat(80));

    const decemberDonations = allDonations.filter((d: any) => isInDecember(d.date));
    let donationsCashTotal = 0;

    decemberDonations.forEach((donation: any) => {
        if (donation.source !== 'Initial Capital' && donation.donorName !== 'Internal Transfer') {
            if (donation.paymentMethod === 'Cash') {
                log(`  [${formatDate(donation.date)}] Donor: ${donation.donorName}, Amount: ${donation.amount}`);
                donationsCashTotal += donation.amount;
            }
        }
    });

    log(`\n  TOTAL DONATIONS (Cash): ${donationsCashTotal} TK`);
    log(`  EXPECTED: ${EXPECTED_VALUES.donationsCash} TK`);
    log(`  DIFFERENCE: ${donationsCashTotal - EXPECTED_VALUES.donationsCash} TK ${donationsCashTotal !== EXPECTED_VALUES.donationsCash ? '!!MISMATCH!!' : 'OK'}`);

    // ========== ANALYZE DECEMBER EXPENSES ==========
    log('\n' + '-'.repeat(80));
    log('4. DECEMBER EXPENSES (Cash only)');
    log('-'.repeat(80));

    const decemberExpenses = allExpenses.filter((e: any) => isInDecember(e.date));
    let expensesCashTotal = 0;

    decemberExpenses.forEach((expense: any) => {
        // In account-overview.ts, if paymentMethod is NOT 'Bank', it's counted as Cash
        if (expense.paymentMethod !== 'Bank') {
            log(`  [${formatDate(expense.date)}] Category: ${expense.category}, Amount: ${expense.amount}, Method: ${expense.paymentMethod || 'Cash (default)'}`);
            expensesCashTotal += expense.amount;
        }
    });

    log(`\n  TOTAL EXPENSES (Cash): ${expensesCashTotal} TK`);
    log(`  EXPECTED: ${EXPECTED_VALUES.expensesCash} TK`);
    log(`  DIFFERENCE: ${expensesCashTotal - EXPECTED_VALUES.expensesCash} TK ${expensesCashTotal !== EXPECTED_VALUES.expensesCash ? '!!MISMATCH!!' : 'OK'}`);

    // ========== ANALYZE DECEMBER TRANSFERS ==========
    log('\n' + '-'.repeat(80));
    log('5. DECEMBER TRANSFERS (affecting Cash)');
    log('-'.repeat(80));

    const decemberTransfers = allTransfers.filter((t: any) => isInDecember(t.date));
    let transfersCashImpact = 0;

    decemberTransfers.forEach((transfer: any) => {
        let impact = 0;
        if (transfer.from === 'Cash') {
            impact -= transfer.amount;
        }
        if (transfer.to === 'Cash') {
            impact += transfer.amount;
        }

        if (impact !== 0) {
            log(`  [${formatDate(transfer.date)}] From: ${transfer.from} -> To: ${transfer.to}, Amount: ${transfer.amount}, Cash Impact: ${impact > 0 ? '+' : ''}${impact}`);
            transfersCashImpact += impact;
        }
    });

    log(`\n  NET TRANSFER IMPACT ON CASH: ${transfersCashImpact} TK`);

    // ========== ANALYZE DECEMBER CAPITAL ==========
    log('\n' + '-'.repeat(80));
    log('6. DECEMBER CAPITAL (Cash only)');
    log('-'.repeat(80));

    const decemberCapital = allCapital.filter((c: any) =>
        c.source !== 'Initial Capital' && isInDecember(c.date) && c.paymentMethod === 'Cash'
    );
    let capitalCashTotal = 0;

    decemberCapital.forEach((capital: any) => {
        log(`  [${formatDate(capital.date)}] Source: ${capital.source}, Amount: ${capital.amount}`);
        capitalCashTotal += capital.amount;
    });

    log(`\n  TOTAL CAPITAL (Cash): ${capitalCashTotal} TK`);

    // ========== LOOK FOR ANY 1800 TK AMOUNTS ==========
    log('\n' + '='.repeat(80));
    log('7. SEARCHING FOR 1800 TK AMOUNTS (the discrepancy amount)');
    log('='.repeat(80));

    let found1800 = false;

    // Check all collections for 1800
    allSales.forEach((s: any) => {
        if (s.total === 1800 || s.amountPaid === 1800) {
            log(`  FOUND in SALES: ID=${s.id}, Date=${formatDate(s.date)}, Total=${s.total}, AmountPaid=${s.amountPaid}, Method=${s.paymentMethod}`);
            found1800 = true;
        }
    });

    allExpenses.forEach((e: any) => {
        if (e.amount === 1800) {
            log(`  FOUND in EXPENSES: ID=${e.id}, Date=${formatDate(e.date)}, Amount=${e.amount}, Category=${e.category}, Method=${e.paymentMethod}`);
            found1800 = true;
        }
    });

    allTransactions.forEach((t: any) => {
        if (t.amount === 1800) {
            log(`  FOUND in TRANSACTIONS: ID=${t.id}, Date=${formatDate(t.dueDate)}, Amount=${t.amount}, Type=${t.type}, Status=${t.status}, Desc=${t.description?.substring(0, 50)}`);
            found1800 = true;
        }
    });

    allDonations.forEach((d: any) => {
        if (d.amount === 1800) {
            log(`  FOUND in DONATIONS: Date=${formatDate(d.date)}, Amount=${d.amount}, Donor=${d.donorName}, Method=${d.paymentMethod}`);
            found1800 = true;
        }
    });

    allCapital.forEach((c: any) => {
        if (c.amount === 1800) {
            log(`  FOUND in CAPITAL: Date=${formatDate(c.date)}, Amount=${c.amount}, Source=${c.source}, Method=${c.paymentMethod}`);
            found1800 = true;
        }
    });

    allTransfers.forEach((t: any) => {
        if (t.amount === 1800) {
            log(`  FOUND in TRANSFERS: Date=${formatDate(t.date)}, Amount=${t.amount}, From=${t.from}, To=${t.to}`);
            found1800 = true;
        }
    });

    if (!found1800) {
        log('  No exact 1800 TK amount found in any collection.');
    }

    // ========== FINAL CALCULATION ==========
    log('\n' + '='.repeat(80));
    log('FINAL CALCULATION');
    log('='.repeat(80));

    const calculatedClosing = OPENING_CASH + salesCashTotal + duePaymentsCashTotal + donationsCashTotal - expensesCashTotal + transfersCashImpact + capitalCashTotal;

    log(`\n  Opening Cash Balance:     ${OPENING_CASH} TK`);
    log(`  + Cash Sales:             ${salesCashTotal} TK`);
    log(`  + Due Payments (Cash):    ${duePaymentsCashTotal} TK`);
    log(`  + Donations (Cash):       ${donationsCashTotal} TK`);
    log(`  - Expenses (Cash):        ${expensesCashTotal} TK`);
    log(`  + Transfers Impact:       ${transfersCashImpact} TK`);
    log(`  + Capital (Cash):         ${capitalCashTotal} TK`);
    log(`  -----------------------------------------`);
    log(`  CALCULATED CLOSING:       ${calculatedClosing} TK`);
    log(`  EXPECTED CLOSING:         65191 TK`);
    log(`  APP SHOWS:                66991 TK`);
    log(`  DISCREPANCY:              ${calculatedClosing - 65191} TK`);

    // ========== ADDITIONAL: Check all Receivable transactions for December ==========
    log('\n' + '='.repeat(80));
    log('8. ALL RECEIVABLE TRANSACTIONS IN DECEMBER (for detailed review)');
    log('='.repeat(80));

    const allDecReceivables = allTransactions.filter((t: any) =>
        isInDecember(t.dueDate) && t.type === 'Receivable'
    );

    allDecReceivables.forEach((t: any) => {
        log(`  [${formatDate(t.dueDate)}] Status: ${t.status}, Amount: ${t.amount}, Method: ${t.paymentMethod || 'N/A'}`);
        log(`    Description: ${t.description}`);
    });

    // Write output to file
    const outputPath = './scripts/cash-balance-analysis.log';
    fs.writeFileSync(outputPath, outputBuffer.join('\n'));
    console.log(`\n\nOutput saved to: ${outputPath}`);

    process.exit(0);
}

analyzeData().catch(console.error);
