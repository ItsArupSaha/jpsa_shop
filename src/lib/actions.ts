
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

import { db } from './firebase';
import type { Book, Customer, Sale, Expense, Transaction, SaleItem, CustomerWithDue } from './types';
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

export async function getCustomersWithDueBalance(): Promise<CustomerWithDue[]> {
    if (!db) return [];

    const [allCustomers, allSales, allTransactions] = await Promise.all([
        getCustomers(),
        getSales(),
        getTransactions('Receivable'),
    ]);

    const customersWithBalances = allCustomers.map(customer => {
        const customerSales = allSales.filter(sale => sale.customerId === customer.id);
        
        const totalDebit = customerSales
            .filter(s => s.paymentMethod === 'Due' || s.paymentMethod === 'Split')
            .reduce((sum, sale) => {
              if (sale.paymentMethod === 'Due') return sum + sale.total;
              if (sale.paymentMethod === 'Split') return sum + (sale.total - (sale.amountPaid || 0));
              return sum;
            }, customer.openingBalance);

        const totalCredit = allTransactions
            .filter(t => t.customerId === customer.id && t.status === 'Paid' && t.description.includes('Payment from customer'))
            .reduce((sum, t) => sum + t.amount, 0);
        
        const dueBalance = totalDebit - totalCredit;

        return { ...customer, dueBalance };
    });

    return customersWithBalances.filter(c => c.dueBalance > 0);
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
  revalidatePath('/receivables');
}

export async function deleteCustomer(id: string) {
  if (!db) return;
  await deleteDoc(doc(db, 'customers', id));
  revalidatePath('/customers');
  revalidatePath('/receivables');
}

// --- Sales Actions ---
export async function getSales(): Promise<Sale[]> {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, 'sales'), orderBy('date', 'desc')));
    return snapshot.docs.map(docToSale);
}

export async function addSale(
    data: Omit<Sale, 'id' | 'date' | 'subtotal' | 'total'>
  ): Promise<{ success: boolean; error?: string; sale?: Sale }> {
    if (!db) return { success: false, error: "Database not configured." };
  
    try {
      return await runTransaction(db, async (transaction) => {
        const saleDate = new Date();
        const bookRefs = data.items.map(item => doc(db, 'books', item.bookId));
        const customerRef = doc(db, 'customers', data.customerId);
        
        // --- 1. Read all data first ---
        const bookDocs = await Promise.all(bookRefs.map(ref => transaction.get(ref)));
        const customerDoc = await transaction.get(customerRef);
        if (!customerDoc.exists()) {
            throw new Error(`Customer with id ${data.customerId} does not exist!`);
        }
        
        // --- 2. Calculate totals and validate stock ---
        let calculatedSubtotal = 0;
        const itemsWithPrices: SaleItem[] = [];
  
        for (let i = 0; i < data.items.length; i++) {
          const bookDoc = bookDocs[i];
          const saleItem = data.items[i];
  
          if (!bookDoc.exists()) {
            throw new Error(`Book with id ${saleItem.bookId} does not exist!`);
          }
          const bookData = bookDoc.data() as Book;
          if (bookData.stock < saleItem.quantity) {
            throw new Error(`Not enough stock for ${bookData.title}. Available: ${bookData.stock}, Requested: ${saleItem.quantity}`);
          }
          
          const price = bookData.sellingPrice;
          calculatedSubtotal += price * saleItem.quantity;
          itemsWithPrices.push({ ...saleItem, price });
        }
  
        let discountAmount = 0;
        if (data.discountType === 'percentage') {
          discountAmount = calculatedSubtotal * (data.discountValue / 100);
        } else if (data.discountType === 'amount') {
          discountAmount = data.discountValue;
        }
        discountAmount = Math.min(calculatedSubtotal, discountAmount);
        const calculatedTotal = calculatedSubtotal - discountAmount;
  
        // --- 3. Perform all writes ---
        const newSaleRef = doc(collection(db, "sales"));
        const saleDataToSave: Omit<Sale, 'id' | 'date'> & { date: Timestamp } = {
          ...data,
          items: itemsWithPrices,
          subtotal: calculatedSubtotal,
          total: calculatedTotal,
          date: Timestamp.fromDate(saleDate),
        };
        transaction.set(newSaleRef, saleDataToSave);
  
        for (let i = 0; i < bookDocs.length; i++) {
          const saleItem = data.items[i];
          const newStock = bookDocs[i].data()!.stock - saleItem.quantity;
          transaction.update(bookRefs[i], { stock: newStock });
        }
  
        if (data.paymentMethod === 'Due' || data.paymentMethod === 'Split') {
          let dueAmount = calculatedTotal;
          if(data.paymentMethod === 'Split' && data.amountPaid) {
            dueAmount = calculatedTotal - data.amountPaid;
          }

          if (dueAmount > 0) {
              const receivableData = {
                description: `Due from Sale #${newSaleRef.id.slice(0, 6)}`,
                amount: dueAmount,
                dueDate: Timestamp.fromDate(new Date()),
                status: 'Pending' as const,
                type: 'Receivable' as const,
                customerId: data.customerId
              };
              const newTransactionRef = doc(collection(db, "transactions"));
              transaction.set(newTransactionRef, receivableData);
          }
        }
  
        const saleForClient: Sale = {
          id: newSaleRef.id,
          date: saleDate.toISOString(),
          ...saleDataToSave,
        };
  
        return { success: true, sale: saleForClient };
      });
    } catch (e) {
      console.error("Sale creation failed: ", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    } finally {
        revalidatePath('/sales');
        revalidatePath('/dashboard');
        revalidatePath('/books');
        revalidatePath('/receivables');
        if (data.customerId) {
            revalidatePath(`/customers/${data.customerId}`);
        }
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
    if (data.customerId) {
      revalidatePath(`/customers/${data.customerId}`);
    }
}

export async function addPayment(data: { customerId: string, amount: number, paymentMethod: 'Cash' | 'Bank' }) {
    if (!db) throw new Error("Database not configured.");

    try {
        await runTransaction(db, async (transaction) => {
            let amountToSettle = data.amount;

            // 1. Create a "credit" transaction for the payment received. This is crucial for accurate history.
            const paymentTransactionData = {
                description: `Payment from customer`,
                amount: data.amount,
                dueDate: Timestamp.fromDate(new Date()),
                status: 'Paid' as const,
                type: 'Receivable' as const,
                paymentMethod: data.paymentMethod,
                customerId: data.customerId
            };
            const newTransactionRef = doc(collection(db, "transactions"));
            transaction.set(newTransactionRef, paymentTransactionData);

            // 2. Find all pending receivables for this customer that were created from sales
            const receivablesQuery = query(
                collection(db, 'transactions'),
                where('type', '==', 'Receivable'),
                where('status', '==', 'Pending'),
                where('customerId', '==', data.customerId),
                where('description', '>=', 'Due from Sale #'),
                where('description', '<=', 'Due from Sale #z'),
                orderBy('dueDate') // Settle oldest debts first
            );
            
            // Note: getDocs() cannot be used inside a transaction.
            // This is a limitation. For this app, we will assume we can fetch them outside
            // and apply the changes. For a production app with high concurrency, this would need a more robust solution.
        });
        
        // This part has to run outside the transaction due to Firestore limitations.
        const receivablesQuery = query(
            collection(db, 'transactions'),
            where('type', '==', 'Receivable'),
            where('status', '==', 'Pending'),
            where('customerId', '==', data.customerId),
            orderBy('dueDate') // Settle oldest debts first
        );
        const pendingDocs = await getDocs(receivablesQuery);
        let amountToSettle = data.amount;

        const batch = writeBatch(db);

        for (const docSnap of pendingDocs.docs) {
            if (amountToSettle <= 0) break; // No more money to settle debts

            const receivable = docSnap.data() as Transaction;
            const receivableRef = doc(db, 'transactions', docSnap.id);
            
            // This logic only handles full settlement of a receivable.
            // A more complex system would handle partial payments against a single receivable.
            if (amountToSettle >= receivable.amount) {
                batch.update(receivableRef, { status: 'Paid' });
                amountToSettle -= receivable.amount;
            }
        }
        await batch.commit();

    } catch (e) {
        console.error("Payment processing failed: ", e);
        throw e; // Rethrow to be caught by the client
    } finally {
        // Revalidate all paths that could be affected by the payment
        revalidatePath('/receivables');
        revalidatePath('/dashboard');
        if (data.customerId) {
            revalidatePath(`/customers/${data.customerId}`);
        }
    }
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

    // Clear existing data
    const collections = ['books', 'customers', 'sales', 'expenses', 'transactions'];
    for (const coll of collections) {
      const snapshot = await getDocs(collection(db, coll));
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
    }
    console.log("Cleared existing data...");


    // Seed Books
    mockBooks.forEach(book => {
        const docRef = doc(collection(db, 'books'));
        batch.set(docRef, book);
    });

    // Seed Customers
    mockCustomers.forEach(customer => {
        const docRef = doc(collection(db, 'customers'));
        batch.set(docRef, customer);
    });

    // Seed Sales
    mockSales.forEach(sale => {
        const docRef = doc(collection(db, 'sales'));
        const saleData = { ...sale, date: Timestamp.fromDate(new Date(sale.date)) };
        batch.set(docRef, saleData);
    });

    // Seed Expenses
    mockExpenses.forEach(expense => {
        const docRef = doc(collection(db, 'expenses'));
        const expenseData = { ...expense, date: Timestamp.fromDate(new Date(expense.date)) };
        batch.set(docRef, expenseData);
    });

    // Seed Transactions
    const allTransactions = [
        ...mockReceivables.map(t => ({ ...t, type: 'Receivable' as const })),
        ...mockPayables.map(t => ({ ...t, type: 'Payable' as const }))
    ];

    allTransactions.forEach(transaction => {
        const docRef = doc(collection(db, 'transactions'));
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
