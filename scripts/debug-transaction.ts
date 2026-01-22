/**
 * Debug script to analyze the 1800 TK transaction and find the root cause
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

async function analyzeTransaction() {
    log('='.repeat(80));
    log('DETAILED ANALYSIS: Finding the source of 1800 TK');
    log('='.repeat(80));

    const [salesSnap, transactionsSnap] = await Promise.all([
        getDocs(collection(db, 'users', USER_ID, 'sales')),
        getDocs(collection(db, 'users', USER_ID, 'transactions')),
    ]);

    const allSales: any[] = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allTransactions: any[] = transactionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Find the specific 1800 TK transaction
    log('\n1. THE SUSPICIOUS TRANSACTION (ID: 7AqSKxzUCha1Ivq5WEET)');
    log('-'.repeat(80));

    const suspiciousTransaction = allTransactions.find((t: any) => t.id === '7AqSKxzUCha1Ivq5WEET');
    if (suspiciousTransaction) {
        log(`  Full transaction data:`);
        log(JSON.stringify(suspiciousTransaction, null, 2));
    } else {
        log('  Transaction not found!');
    }

    // Find all transactions with 1800 amount
    log('\n2. ALL TRANSACTIONS WITH 1800 TK AMOUNT');
    log('-'.repeat(80));

    allTransactions.filter((t: any) => t.amount === 1800).forEach((t: any) => {
        log(`  ID: ${t.id}`);
        log(`  Date: ${formatDate(t.dueDate)}`);
        log(`  Amount: ${t.amount}`);
        log(`  Type: ${t.type}`);
        log(`  Status: ${t.status}`);
        log(`  Description: ${t.description}`);
        log(`  Payment Method: ${t.paymentMethod || 'N/A'}`);
        log(`  Customer ID: ${t.customerId || 'N/A'}`);
        log(`  Sale ID: ${t.saleId || 'N/A'}`);
        log('');
    });

    // Find any sales with 1800 and check for related transactions
    log('\n3. CHECKING FOR DOUBLE-COUNTING IN SALES');
    log('-'.repeat(80));

    // Check all sales where paymentMethod is Cash and see if there's ALSO a transaction for it
    let doubleCountedAmount = 0;

    allSales.forEach((sale: any) => {
        // A sale with Cash payment method should NOT have a "Payment from customer" transaction
        // because the cash is already counted from the sale itself
        if (sale.paymentMethod === 'Cash' || sale.paymentMethod === 'Bank') {
            // Check if there's a corresponding "Payment from customer" transaction
            const relatedTransactions = allTransactions.filter((t: any) =>
                t.description?.startsWith('Payment from customer') &&
                t.status === 'Paid' &&
                t.customerId === sale.customerId &&
                t.amount === sale.total
            );

            if (relatedTransactions.length > 0) {
                log(`  POTENTIAL DOUBLE COUNT FOUND!`);
                log(`  Sale ID: ${sale.saleId || sale.id}`);
                log(`  Sale Date: ${formatDate(sale.date)}`);
                log(`  Sale Total: ${sale.total}`);
                log(`  Payment Method: ${sale.paymentMethod}`);
                log(`  Related Transaction IDs: ${relatedTransactions.map((t: any) => t.id).join(', ')}`);
                log('');
                doubleCountedAmount += sale.total;
            }
        }
    });

    if (doubleCountedAmount === 0) {
        log('  No obvious double-counting found in sales with direct amount match.');
    }

    // Now check all "Payment from customer" transactions and see what they're for
    log('\n4. ALL "Payment from customer" TRANSACTIONS (Paid, Cash)');
    log('-'.repeat(80));

    const paymentFromCustomerTransactions = allTransactions.filter((t: any) =>
        t.description?.startsWith('Payment from customer') &&
        t.status === 'Paid' &&
        t.paymentMethod === 'Cash'
    );

    log(`  Total count: ${paymentFromCustomerTransactions.length}`);
    log(`  Total amount: ${paymentFromCustomerTransactions.reduce((sum: number, t: any) => sum + t.amount, 0)} TK`);
    log('');

    paymentFromCustomerTransactions.forEach((t: any) => {
        log(`  [${formatDate(t.dueDate)}] ID: ${t.id}, Amount: ${t.amount}, Customer: ${t.customerId}`);
    });

    // Check if any of these transactions shouldn't be there
    log('\n5. LOOKING FOR ORPHAN TRANSACTIONS (no matching sale)');
    log('-'.repeat(80));

    paymentFromCustomerTransactions.forEach((t: any) => {
        // If it has a saleId, it should be a due payment, not a direct cash sale
        if (t.saleId) {
            const relatedSale = allSales.find((s: any) => s.saleId === t.saleId);
            if (relatedSale) {
                log(`  Transaction ID: ${t.id}`);
                log(`  Transaction Amount: ${t.amount}`);
                log(`  Related Sale ID: ${t.saleId}`);
                log(`  Sale Payment Method: ${relatedSale.paymentMethod}`);
                if (relatedSale.paymentMethod === 'Cash' || relatedSale.paymentMethod === 'Bank') {
                    log(`  *** WARNING: This sale was paid directly (${relatedSale.paymentMethod}), but there's ALSO a transaction for it!`);
                }
                log('');
            }
        }
    });

    // Final: List all Cash sales and all "Payment from customer" transactions separately
    log('\n6. COMPARISON: Cash Sales vs Payment Transactions');
    log('-'.repeat(80));

    const cashSalesTotal = allSales
        .filter((s: any) => s.paymentMethod === 'Cash')
        .reduce((sum: number, s: any) => sum + s.total, 0);

    const paymentTransactionsTotal = paymentFromCustomerTransactions
        .reduce((sum: number, t: any) => sum + t.amount, 0);

    log(`  Total Cash Sales: ${cashSalesTotal} TK`);
    log(`  Total Payment Transactions (Cash): ${paymentTransactionsTotal} TK`);
    log(`  Combined (what account-overview adds): ${cashSalesTotal + paymentTransactionsTotal} TK`);
    log('');
    log(`  If both are added, there could be double-counting of ${Math.min(cashSalesTotal, paymentTransactionsTotal)} TK!`);

    // Write output to file
    const outputPath = './scripts/detailed-analysis.log';
    fs.writeFileSync(outputPath, outputBuffer.join('\n'));
    console.log(`\n\nOutput saved to: ${outputPath}`);

    process.exit(0);
}

analyzeTransaction().catch(console.error);
