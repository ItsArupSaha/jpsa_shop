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
  DocumentReference,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from './firebase';
import type { Book, Customer, Sale, Expense, Transaction, SaleItem } from './types';
import { books as mockBooks, customers as mockCustomers, sales as mockSales, expenses as mockExpenses, receivables as mockReceivables, payables as mockPayables } from './data';


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

export async function getCustomerById(id: string): Promise<Customer | null> {
    if (!db) return null;
    const docRef = doc(db, 'customers', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docToCustomer(docSnap);
    } else {
        return null;
    }
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

export async function addSale(data: Omit<Sale, 'id' | 'date'>): Promise<{ success: boolean; error?: string; sale?: Sale }> {
    if (!db) return { success: false, error: "Database not configured." };
    
    try {
        const batch = writeBatch(db);
        const saleDate = new Date();
        
        // --- 1. Validate stock and prepare book updates ---
        for (const item of data.items) {
            const bookRef = doc(db, 'books', item.bookId);
            const bookDoc = await getDoc(bookRef);

            if (!bookDoc.exists()) {
                throw new Error(`Book with id ${item.bookId} does not exist!`);
            }
            const currentStock = bookDoc.data().stock;
            if (currentStock < item.quantity) {
                throw new Error(`Not enough stock for ${bookDoc.data().title}. Available: ${currentStock}, Requested: ${item.quantity}`);
            }
            const newStock = currentStock - item.quantity;
            batch.update(bookRef, { stock: newStock });
        }

        // --- 2. Prepare sale record ---
        const newSaleRef = doc(collection(db, "sales"));
        const saleDataToSave = {
            ...data,
            date: Timestamp.fromDate(saleDate),
        };
        batch.set(newSaleRef, saleDataToSave);


        // --- 3. Handle 'Due' payment method ---
        if (data.paymentMethod === 'Due') {
            const customerRef = doc(db, 'customers', data.customerId);
            const customerDoc = await getDoc(customerRef);
            if (!customerDoc.exists()) {
                throw new Error(`Customer with id ${data.customerId} does not exist!`);
            }
            const customerData = customerDoc.data();
            const receivableData = {
                description: `Sale to ${customerData.name}`,
                amount: data.total,
                dueDate: Timestamp.fromDate(new Date()),
                status: 'Pending',
                type: 'Receivable'
            };
            const newTransactionRef = doc(collection(db, "transactions"));
            batch.set(newTransactionRef, receivableData);
        }

        // --- 4. Commit all writes at once ---
        await batch.commit();

        // --- 5. Revalidate paths and return success ---
        revalidatePath('/sales');
        revalidatePath('/dashboard');
        revalidatePath('/books');
        if (data.paymentMethod === 'Due') {
            revalidatePath('/receivables');
        }

        const saleForClient: Sale = {
          ...data,
          id: newSaleRef.id,
          date: saleDate.toISOString(),
        };

        return { success: true, sale: saleForClient };

    } catch (e) {
        console.error("Sale creation failed: ", e);
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

// --- Database Seeding ---
export async function seedDatabase() {
    if (!db) return;
    console.log("Starting database seed...");
    
    const batch = writeBatch(db);

    // Seed Books
    mockBooks.forEach(book => {
        const docRef = doc(db, 'books', book.id);
        batch.set(docRef, book);
    });

    // Seed Customers
    mockCustomers.forEach(customer => {
        const docRef = doc(db, 'customers', customer.id);
        batch.set(docRef, customer);
    });

    // Seed Sales
    mockSales.forEach(sale => {
        const docRef = doc(db, 'sales', sale.id);
        const saleData = { ...sale, date: Timestamp.fromDate(new Date(sale.date)) };
        batch.set(docRef, saleData);
    });

    // Seed Expenses
    mockExpenses.forEach(expense => {
        const docRef = doc(db, 'expenses', expense.id);
        const expenseData = { ...expense, date: Timestamp.fromDate(new Date(expense.date)) };
        batch.set(docRef, expenseData);
    });

    // Seed Transactions
    const allTransactions = [
        ...mockReceivables.map(t => ({ ...t, type: 'Receivable' as const })),
        ...mockPayables.map(t => ({ ...t, type: 'Payable' as const }))
    ];

    allTransactions.forEach(transaction => {
        const docRef = doc(db, 'transactions', transaction.id);
        const transactionData = { ...transaction, dueDate: Timestamp.fromDate(new Date(transaction.dueDate)) };
        batch.set(docRef, transactionData);
    });

    await batch.commit();
    console.log("Database seeded successfully!");

    // Revalidate all paths that might have changed
    revalidatePath('/dashboard');
    revalidatePath('/books');
    revalidatePath('/customers');
    revalidatePath('/sales');
    revalidatePath('/expenses');
    revalidatePath('/receivables');
    revalidatePath('/payables');
}
