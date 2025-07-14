'use server';

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  writeBatch,
  Timestamp,
  runTransaction,
  getDoc,
  orderBy,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from './firebase';
import type { Book, Customer, Sale, Expense, Transaction, SaleItem } from './types';

// Helper to convert Firestore docs to our types
function docToBook(d: any): Book {
  return { id: d.id, ...d.data() } as Book;
}
function docToCustomer(d: any): Customer {
  return { id: d.id, ...d.data() } as Customer;
}
function docToSale(d: any): Sale {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date.toDate().toISOString(),
    } as Sale;
}
function docToExpense(d: any): Expense {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date.toDate().toISOString(),
    } as Expense;
}
function docToTransaction(d: any): Transaction {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        dueDate: data.dueDate.toDate().toISOString(),
    } as Transaction;
}


// --- Books Actions ---
export async function getBooks(): Promise<Book[]> {
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, 'books'), orderBy('title')));
  return snapshot.docs.map(docToBook);
}

export async function addBook(data: Omit<Book, 'id'>) {
  if (!db) return;
  await addDoc(collection(db, 'books'), data);
  revalidatePath('/books');
}

export async function updateBook(id: string, data: Omit<Book, 'id'>) {
  if (!db) return;
  await updateDoc(doc(db, 'books', id), data);
  revalidatePath('/books');
}

export async function deleteBook(id: string) {
  if (!db) return;
  await deleteDoc(doc(db, 'books', id));
  revalidatePath('/books');
}


// --- Customers Actions ---
export async function getCustomers(): Promise<Customer[]> {
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, 'customers'), orderBy('name')));
  return snapshot.docs.map(docToCustomer);
}

export async function addCustomer(data: Omit<Customer, 'id'>) {
  if (!db) return;
  await addDoc(collection(db, 'customers'), data);
  revalidatePath('/customers');
}

export async function updateCustomer(id: string, data: Omit<Customer, 'id'>) {
  if (!db) return;
  await updateDoc(doc(db, 'customers', id), data);
  revalidatePath('/customers');
}

export async function deleteCustomer(id: string) {
  if (!db) return;
  await deleteDoc(doc(db, 'customers', id));
  revalidatePath('/customers');
}

// --- Sales Actions ---
export async function getSales(): Promise<Sale[]> {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, 'sales'), orderBy('date', 'desc')));
    return snapshot.docs.map(docToSale);
}

export async function addSale(data: Omit<Sale, 'id' | 'date'>) {
    if (!db) return { success: false, error: "Database not configured." };
    try {
        await runTransaction(db, async (transaction) => {
            const saleData = {
                ...data,
                date: Timestamp.fromDate(new Date()),
            };

            // 1. Add the sale
            transaction.set(doc(collection(db, "sales")), saleData);

            // 2. Update book stock
            for (const item of data.items) {
                const bookRef = doc(db, 'books', item.bookId);
                const bookDoc = await transaction.get(bookRef);
                if (!bookDoc.exists()) {
                    throw `Book with id ${item.bookId} does not exist!`;
                }
                const currentStock = bookDoc.data().stock;
                if (currentStock < item.quantity) {
                    throw `Not enough stock for ${bookDoc.data().title}. Available: ${currentStock}, Requested: ${item.quantity}`;
                }
                transaction.update(bookRef, { stock: currentStock - item.quantity });
            }

            // 3. Create receivable if payment is due
            if (data.paymentMethod === 'Due') {
                const customerDoc = await getDoc(doc(db, 'customers', data.customerId));
                const customer = customerDoc.data();
                const receivableData = {
                    description: `Sale to ${customer?.name}`,
                    amount: data.total,
                    dueDate: Timestamp.fromDate(new Date()), // Or a calculated due date
                    status: 'Pending',
                    type: 'Receivable'
                };
                transaction.set(doc(collection(db, "transactions")), receivableData);
                revalidatePath('/receivables');
            }
        });
        revalidatePath('/sales');
        revalidatePath('/dashboard');
        revalidatePath('/books');
        return { success: true };
    } catch (e) {
        console.error("Transaction failed: ", e);
        return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
}


// --- Expenses Actions ---
export async function getExpenses(): Promise<Expense[]> {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));
    return snapshot.docs.map(docToExpense);
}

export async function addExpense(data: Omit<Expense, 'id' | 'date'> & { date: Date }) {
    if (!db) return;
    const expenseData = {
        ...data,
        date: Timestamp.fromDate(data.date),
    };
    await addDoc(collection(db, 'expenses'), expenseData);
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
}

export async function deleteExpense(id: string) {
    if (!db) return;
    await deleteDoc(doc(db, 'expenses', id));
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
}


// --- Transactions (Receivables/Payables) Actions ---
export async function getTransactions(type: 'Receivable' | 'Payable'): Promise<Transaction[]> {
    if (!db) return [];
    const q = query(collection(db, 'transactions'), where('type', '==', type));
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(docToTransaction);
    // Sort manually to avoid needing a composite index
    transactions.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    return transactions;
}

export async function addTransaction(data: Omit<Transaction, 'id' | 'dueDate' | 'status'> & { dueDate: Date }) {
    if (!db) return;
    const transactionData = {
        ...data,
        status: 'Pending',
        dueDate: Timestamp.fromDate(data.dueDate),
    };
    await addDoc(collection(db, 'transactions'), transactionData);
    revalidatePath(`/${data.type.toLowerCase()}s`);
    revalidatePath('/dashboard');
}

export async function updateTransactionStatus(id: string, status: 'Pending' | 'Paid', type: 'Receivable' | 'Payable') {
    if (!db) return;
    await updateDoc(doc(db, 'transactions', id), { status });
    revalidatePath(`/${type.toLowerCase()}s`);
    revalidatePath('/dashboard');
}

export async function deleteTransaction(id: string, type: 'Receivable' | 'Payable') {
    if (!db) return;
    await deleteDoc(doc(db, 'transactions', id));
    revalidatePath(`/${type.toLowerCase()}s`);
    revalidatePath('/dashboard');
}
