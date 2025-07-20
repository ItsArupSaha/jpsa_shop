
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
  collectionGroup,
  limit,
  startAfter,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

import { db } from './firebase';
import type { Book, Customer, Sale, Expense, Transaction, SaleItem, CustomerWithDue, Purchase, PurchaseItem, Metadata, Donation } from './types';

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
function docToPurchase(d: any): Purchase {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date.toDate().toISOString(),
        dueDate: data.dueDate.toDate().toISOString(),
    } as Purchase;
}
function docToExpense(d: any): Expense {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date.toDate().toISOString(),
    } as Expense;
}
function docToDonation(d: any): Donation {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date.toDate().toISOString(),
    } as Donation;
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

export async function getBooksPaginated({ pageLimit = 15, lastVisibleId }: { pageLimit?: number, lastVisibleId?: string }): Promise<{ books: Book[], hasMore: boolean }> {
  if (!db) return { books: [], hasMore: false };

  let q = query(
      collection(db, 'books'),
      orderBy('title'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(db, 'books', lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const books = snapshot.docs.map(docToBook);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(collection(db, 'books'), orderBy('title'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { books, hasMore };
}

export async function addBook(data: Omit<Book, 'id'>) {
  if (!db) return;
  const newDocRef = await addDoc(collection(db, 'books'), data);
  revalidatePath('/books');
  revalidatePath('/balance-sheet');
  return { id: newDocRef.id, ...data };
}

export async function updateBook(id: string, data: Omit<Book, 'id'>) {
  if (!db) return;
  await updateDoc(doc(db, 'books', id), data);
  revalidatePath('/books');
  revalidatePath('/balance-sheet');
}

export async function deleteBook(id: string) {
  if (!db) return;
  await deleteDoc(doc(db, 'books', id));
  revalidatePath('/books');
  revalidatePath('/balance-sheet');
}


// --- Customers Actions ---
export async function getCustomers(): Promise<Customer[]> {
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, 'customers'), orderBy('name')));
  return snapshot.docs.map(docToCustomer);
}

export async function getCustomersPaginated({ pageLimit = 15, lastVisibleId }: { pageLimit?: number, lastVisibleId?: string }): Promise<{ customers: Customer[], hasMore: boolean }> {
    if (!db) return { customers: [], hasMore: false };

    let q = query(
        collection(db, 'customers'),
        orderBy('name'),
        limit(pageLimit)
    );

    if (lastVisibleId) {
        const lastVisibleDoc = await getDoc(doc(db, 'customers', lastVisibleId));
        if (lastVisibleDoc.exists()) {
            q = query(q, startAfter(lastVisibleDoc));
        }
    }

    const snapshot = await getDocs(q);
    const customers = snapshot.docs.map(docToCustomer);

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    let hasMore = false;
    if (lastDoc) {
        const nextQuery = query(collection(db, 'customers'), orderBy('name'), startAfter(lastDoc), limit(1));
        const nextSnapshot = await getDocs(nextQuery);
        hasMore = !nextSnapshot.empty;
    }

    return { customers, hasMore };
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

    const allCustomers = await getCustomers();
    const allSales = await getSales();
    const allTransactionsData = await getDocs(collection(db, 'transactions'));
    const allTransactions = allTransactionsData.docs.map(docToTransaction);

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

    // Sort by due balance descending
    return customersWithBalances.filter(c => c.dueBalance > 0.01).sort((a,b) => b.dueBalance - a.dueBalance);
}

export async function getCustomersWithDueBalancePaginated({ pageLimit = 15, lastVisible }: { pageLimit?: number, lastVisible?: { id: string, dueBalance: number } }): Promise<{ customersWithDue: CustomerWithDue[], hasMore: boolean }> {
  if (!db) return { customersWithDue: [], hasMore: false };

  const allCustomersWithDue = await getCustomersWithDueBalance();
  
  let startIndex = 0;
  if (lastVisible) {
      startIndex = allCustomersWithDue.findIndex(c => c.id === lastVisible.id) + 1;
  }

  const paginatedCustomers = allCustomersWithDue.slice(startIndex, startIndex + pageLimit);
  const hasMore = startIndex + pageLimit < allCustomersWithDue.length;

  return { customersWithDue: paginatedCustomers, hasMore };
}


export async function addCustomer(data: Omit<Customer, 'id'>) {
  if (!db) return;
  const newDocRef = await addDoc(collection(db, 'customers'), data);
  revalidatePath('/customers');
  return { id: newDocRef.id, ...data };
}

export async function updateCustomer(id: string, data: Omit<Customer, 'id'>) {
  if (!db) return;
  await updateDoc(doc(db, 'customers', id), data);
  revalidatePath('/customers');
  revalidatePath('/receivables');
  revalidatePath(`/customers/${id}`);
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

export async function getSalesPaginated({ pageLimit = 10, lastVisibleId }: { pageLimit?: number, lastVisibleId?: string }): Promise<{ sales: Sale[], hasMore: boolean }> {
  if (!db) return { sales: [], hasMore: false };

  let q = query(
      collection(db, 'sales'),
      orderBy('date', 'desc'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(db, 'sales', lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const sales = snapshot.docs.map(docToSale);
  
  // Check if there are more documents
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(collection(db, 'sales'), orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { sales, hasMore };
}


export async function getSalesForCustomer(customerId: string): Promise<Sale[]> {
  if (!db) return [];
  const q = query(
      collection(db, 'sales'),
      where('customerId', '==', customerId),
      orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToSale);
}

export async function getSalesForMonth(year: number, month: number): Promise<Sale[]> {
    if (!db) return [];
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const q = query(
        collection(db, 'sales'),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToSale);
}

export async function addSale(
    data: Omit<Sale, 'id' | 'date' | 'subtotal' | 'total'>
  ): Promise<{ success: boolean; error?: string; sale?: Sale }> {
    if (!db) return { success: false, error: "Database not configured." };
  
    try {
      const result = await runTransaction(db, async (transaction) => {
        const saleDate = new Date();
        const bookRefs = data.items.map(item => doc(db, 'books', item.bookId));
        const customerRef = doc(db, 'customers', data.customerId);
        
        const bookDocs = await Promise.all(bookRefs.map(ref => transaction.get(ref)));
        const customerDoc = await transaction.get(customerRef);
        if (!customerDoc.exists()) {
            throw new Error(`Customer with id ${data.customerId} does not exist!`);
        }
        
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
      revalidatePath('/sales');
      revalidatePath('/dashboard');
      revalidatePath('/books');
      revalidatePath('/receivables');
      revalidatePath('/balance-sheet');
      if (data.customerId) {
          revalidatePath(`/customers/${data.customerId}`);
      }
      return result;
    } catch (e) {
      console.error("Sale creation failed: ", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
}

// --- Purchases Actions ---
export async function getPurchases(): Promise<Purchase[]> {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, 'purchases'), orderBy('date', 'desc')));
    return snapshot.docs.map(docToPurchase);
}

export async function getPurchasesPaginated({ pageLimit = 10, lastVisibleId }: { pageLimit?: number, lastVisibleId?: string }): Promise<{ purchases: Purchase[], hasMore: boolean }> {
  if (!db) return { purchases: [], hasMore: false };

  let q = query(
      collection(db, 'purchases'),
      orderBy('date', 'desc'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(db, 'purchases', lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const purchases = snapshot.docs.map(docToPurchase);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(collection(db, 'purchases'), orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { purchases, hasMore };
}

export async function addPurchase(data: Omit<Purchase, 'id' | 'date' | 'totalAmount' | 'purchaseId'> & { dueDate: Date }) {
  if (!db) return { success: false, error: 'Database not connected' };

  try {
      const result = await runTransaction(db, async (transaction) => {
          const purchaseDate = new Date();
          const metadataRef = doc(db, 'metadata', 'counters');

          const metadataDoc = await transaction.get(metadataRef);
          let lastPurchaseNumber = 0;
          if (metadataDoc.exists()) {
              lastPurchaseNumber = (metadataDoc.data() as Metadata).lastPurchaseNumber || 0;
          }
          const newPurchaseNumber = lastPurchaseNumber + 1;
          const purchaseId = `PUR-${String(newPurchaseNumber).padStart(4, '0')}`;
          
          let totalAmount = 0;
          for (const item of data.items) {
              totalAmount += item.cost * item.quantity;
          }

          const newPurchaseRef = doc(collection(db, 'purchases'));
          const purchaseData = {
              ...data,
              purchaseId,
              date: Timestamp.fromDate(purchaseDate),
              dueDate: Timestamp.fromDate(data.dueDate),
              totalAmount: totalAmount,
          };
          transaction.set(newPurchaseRef, purchaseData);
          transaction.set(metadataRef, { lastPurchaseNumber: newPurchaseNumber }, { merge: true });

          const booksCollectionRef = collection(db, 'books');
          for (const item of data.items) {
              if (item.category === 'Book') {
                  const q = query(booksCollectionRef, where("title", "==", item.itemName));
                  const bookSnapshot = await getDocs(q); 

                  if (!bookSnapshot.empty) {
                      const bookDoc = bookSnapshot.docs[0];
                      const currentStock = bookDoc.data().stock || 0;
                      transaction.update(bookDoc.ref, { stock: currentStock + item.quantity });
                  } else {
                      const newBookRef = doc(booksCollectionRef);
                      const newBookData: Omit<Book, 'id'> = {
                          title: item.itemName,
                          author: item.author || 'Unknown',
                          stock: item.quantity,
                          productionPrice: item.cost,
                          sellingPrice: item.cost * 1.5,
                      };
                      transaction.set(newBookRef, newBookData);
                  }
              }
          }

          if (data.paymentMethod === 'Cash' || data.paymentMethod === 'Bank') {
              const expenseData = {
                  description: `Payment for Purchase ${purchaseId}`,
                  amount: totalAmount,
                  date: Timestamp.fromDate(new Date()),
                  paymentMethod: data.paymentMethod,
              };
              transaction.set(doc(collection(db, 'expenses')), expenseData);
          } else if (data.paymentMethod === 'Split') {
              const amountPaid = data.amountPaid || 0;
              const payableAmount = totalAmount - amountPaid;

              if (amountPaid > 0) {
                  const expenseData = {
                      description: `Partial payment for Purchase ${purchaseId}`,
                      amount: amountPaid,
                      date: Timestamp.fromDate(new Date()),
                      paymentMethod: data.splitPaymentMethod,
                  };
                  transaction.set(doc(collection(db, 'expenses')), expenseData);
              }

              if (payableAmount > 0) {
                  const payableData = {
                      description: `Balance for Purchase ${purchaseId} from ${data.supplier}`,
                      amount: payableAmount,
                      dueDate: Timestamp.fromDate(data.dueDate),
                      status: 'Pending' as const,
                      type: 'Payable' as const,
                  };
                  transaction.set(doc(collection(db, 'transactions')), payableData);
              }
          } else if (data.paymentMethod === 'Due') {
              const payableData = {
                  description: `Purchase ${purchaseId} from ${data.supplier}`,
                  amount: totalAmount,
                  dueDate: Timestamp.fromDate(data.dueDate),
                  status: 'Pending' as const,
                  type: 'Payable' as const,
              };
              transaction.set(doc(collection(db, 'transactions')), payableData);
          }

          return { success: true, purchase: { id: newPurchaseRef.id, ...purchaseData, date: purchaseDate.toISOString(), dueDate: data.dueDate.toISOString() } };
      });

      revalidatePath('/purchases');
      revalidatePath('/books');
      revalidatePath('/payables');
      revalidatePath('/expenses');
      revalidatePath('/dashboard');
      revalidatePath('/balance-sheet');
      return result;
  } catch (e) {
      console.error("Purchase creation failed: ", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}


// --- Expenses Actions ---
export async function getExpenses(): Promise<Expense[]> {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));
    return snapshot.docs.map(docToExpense);
}

export async function getExpensesPaginated({ pageLimit = 10, lastVisibleId }: { pageLimit?: number, lastVisibleId?: string }): Promise<{ expenses: Expense[], hasMore: boolean }> {
  if (!db) return { expenses: [], hasMore: false };

  let q = query(
      collection(db, 'expenses'),
      orderBy('date', 'desc'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(db, 'expenses', lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const expenses = snapshot.docs.map(docToExpense);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(collection(db, 'expenses'), orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { expenses, hasMore };
}

export async function getExpensesForMonth(year: number, month: number): Promise<Expense[]> {
    if (!db) return [];
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const q = query(
        collection(db, 'expenses'),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToExpense);
}

export async function addExpense(data: Omit<Expense, 'id' | 'date'> & { date: Date }): Promise<Expense> {
    if (!db) throw new Error("Database not connected");
    const expenseData = {
        ...data,
        date: Timestamp.fromDate(data.date),
    };
    const newDocRef = await addDoc(collection(db, 'expenses'), expenseData);
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
    return { ...data, id: newDocRef.id, date: data.date.toISOString() };
}

export async function deleteExpense(id: string) {
    if (!db) return;
    await deleteDoc(doc(db, 'expenses', id));
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
}

// --- Donations Actions ---
export async function getDonations(): Promise<Donation[]> {
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, 'donations'), orderBy('date', 'desc')));
  return snapshot.docs.map(docToDonation);
}

export async function getDonationsPaginated({ pageLimit = 10, lastVisibleId }: { pageLimit?: number, lastVisibleId?: string }): Promise<{ donations: Donation[], hasMore: boolean }> {
  if (!db) return { donations: [], hasMore: false };

  let q = query(
      collection(db, 'donations'),
      orderBy('date', 'desc'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(db, 'donations', lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const donations = snapshot.docs.map(docToDonation);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(collection(db, 'donations'), orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { donations, hasMore };
}


export async function getDonationsForMonth(year: number, month: number): Promise<Donation[]> {
    if (!db) return [];
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const q = query(
        collection(db, 'donations'),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToDonation);
}

export async function addDonation(data: Omit<Donation, 'id' | 'date'> & { date: Date }): Promise<Donation> {
  if (!db) throw new Error("Database not connected.");
  const donationData = {
      ...data,
      date: Timestamp.fromDate(data.date),
  };
  const newDocRef = await addDoc(collection(db, 'donations'), donationData);
  revalidatePath('/donations');
  revalidatePath('/balance-sheet');
  return { ...data, id: newDocRef.id, date: data.date.toISOString() };
}


// --- Transactions (Receivables/Payables) Actions ---
export async function getTransactions(type: 'Receivable' | 'Payable'): Promise<Transaction[]> {
    if (!db) return [];
    const q = query(collection(db, 'transactions'), where('type', '==', type), where('status', '==', 'Pending'));
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(docToTransaction);
    // Sort in application code to avoid needing a composite index
    return transactions.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

export async function getTransactionsPaginated({ type, pageLimit = 15, lastVisibleId }: { type: 'Receivable' | 'Payable', pageLimit?: number, lastVisibleId?: string }): Promise<{ transactions: Transaction[], hasMore: boolean }> {
  if (!db) return { transactions: [], hasMore: false };
  let q = query(
    collection(db, 'transactions'), 
    where('type', '==', type), 
    where('status', '==', 'Pending'),
    orderBy('dueDate', 'desc'),
    limit(pageLimit)
  );

  if (lastVisibleId) {
    const lastVisibleDoc = await getDoc(doc(db, 'transactions', lastVisibleId));
    if (lastVisibleDoc.exists()) {
        q = query(q, startAfter(lastVisibleDoc));
    }
  }
  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(docToTransaction);

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if (lastDoc) {
    const nextQuery = query(
        collection(db, 'transactions'), 
        where('type', '==', type), 
        where('status', '==', 'Pending'),
        orderBy('dueDate', 'desc'),
        startAfter(lastDoc), 
        limit(1)
    );
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }
  
  return { transactions, hasMore };
}

export async function getTransactionsForCustomer(customerId: string, type: 'Receivable' | 'Payable'): Promise<Transaction[]> {
  if (!db) return [];
  const q = query(
      collection(db, 'transactions'),
      where('type', '==', type),
      where('customerId', '==', customerId)
  );
  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(docToTransaction);
  return transactions.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

export async function addTransaction(data: Omit<Transaction, 'id' | 'dueDate' | 'status'> & { dueDate: Date }): Promise<Transaction> {
    if (!db) throw new Error("Database not connected");
    const transactionData = {
        ...data,
        status: 'Pending' as const,
        dueDate: Timestamp.fromDate(data.dueDate),
    };
    const newDocRef = await addDoc(collection(db, 'transactions'), transactionData);
    revalidatePath(`/${data.type.toLowerCase()}s`);
    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
    if (data.customerId) {
      revalidatePath(`/customers/${data.customerId}`);
    }
    return { ...transactionData, id: newDocRef.id, dueDate: data.dueDate.toISOString() };
}

export async function addPayment(data: { customerId: string, amount: number, paymentMethod: 'Cash' | 'Bank' }) {
    if (!db) throw new Error("Database not configured.");

    try {
        const result = await runTransaction(db, async (transaction) => {
            let amountToSettle = data.amount;

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

            const receivablesQuery = query(
                collection(db, 'transactions'),
                where('type', '==', 'Receivable'),
                where('status', '==', 'Pending'),
                where('customerId', '==', data.customerId),
                orderBy('dueDate')
            );
            
            const pendingDocs = await getDocs(receivablesQuery);
            
            for (const docSnap of pendingDocs.docs) {
                if (amountToSettle <= 0) break;

                const receivable = docToTransaction(docSnap);
                const receivableRef = doc(db, 'transactions', docSnap.id);
                
                if (amountToSettle >= receivable.amount) {
                    transaction.update(receivableRef, { status: 'Paid' });
                    amountToSettle -= receivable.amount;
                }
            }
             return { success: true };
        });

        revalidatePath('/receivables');
        revalidatePath('/dashboard');
        revalidatePath('/balance-sheet');
        if (data.customerId) {
            revalidatePath(`/customers/${data.customerId}`);
        }
        return result;

    } catch (e) {
        console.error("Payment processing failed: ", e);
        throw e instanceof Error ? e : new Error('An unknown error occurred during payment processing.');
    }
}


export async function updateTransactionStatus(id: string, status: 'Pending' | 'Paid', type: 'Receivable' | 'Payable') {
    if (!db) return;
    const transRef = doc(db, 'transactions', id);
    const transDoc = await getDoc(transRef);
    
    await updateDoc(transRef, { status });

    revalidatePath(`/${type.toLowerCase()}s`);
    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
    if (transDoc.exists()){
      const customerId = transDoc.data().customerId;
      if (customerId) {
        revalidatePath(`/customers/${customerId}`);
        revalidatePath('/receivables');
      }
    }
}

export async function deleteTransaction(id: string, type: 'Receivable' | 'Payable') {
    if (!db) return;
    await deleteDoc(doc(db, 'transactions', id));
    revalidatePath(`/${type.toLowerCase()}s`);
    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
}

// --- Balance Sheet Action ---
export async function getBalanceSheetData() {
    if (!db) {
        throw new Error("Database not connected");
    }

    const [books, sales, expenses, allTransactionsData, purchases, donations] = await Promise.all([
        getBooks(),
        getSales(),
        getExpenses(),
        getDocs(collection(db, 'transactions')),
        getPurchases(),
        getDonations(),
    ]);
    const allTransactions = allTransactionsData.docs.map(docToTransaction);

    let cash = 0;
    let bank = 0;

    sales.forEach(sale => {
        if (sale.paymentMethod === 'Cash') {
            cash += sale.total;
        } else if (sale.paymentMethod === 'Bank') {
            bank += sale.total;
        } else if (sale.paymentMethod === 'Split' && sale.amountPaid) {
            cash += sale.amountPaid;
        }
    });
    
    donations.forEach(donation => {
        if (donation.paymentMethod === 'Cash') {
            cash += donation.amount;
        } else if (donation.paymentMethod === 'Bank') {
            bank += donation.amount;
        }
    });

    allTransactions.forEach(t => {
        if (t.type === 'Receivable' && t.status === 'Paid' && t.description.includes('Payment from customer')) {
            if (t.paymentMethod === 'Cash') {
                cash += t.amount;
            } else if (t.paymentMethod === 'Bank') {
                bank += t.amount;
            }
        }
    });

    expenses.forEach(expense => {
        if (expense.paymentMethod === 'Bank') {
            bank -= expense.amount;
        } else {
            cash -= expense.amount;
        }
    });

    const stockValue = books.reduce((sum, book) => sum + (book.productionPrice * book.stock), 0);

    const officeAssetsValue = purchases
        .flatMap(p => p.items)
        .filter(i => i.category === 'Office Asset')
        .reduce((sum, item) => sum + (item.cost * item.quantity), 0);

    const receivables = allTransactions
        .filter(t => t.type === 'Receivable' && t.status === 'Pending')
        .reduce((sum, t) => sum + t.amount, 0);

    const payables = allTransactions
        .filter(t => t.type === 'Payable' && t.status === 'Pending')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalAssets = cash + bank + receivables + stockValue + officeAssetsValue;
    const equity = totalAssets - payables;

    return {
        cash,
        bank,
        stockValue,
        officeAssetsValue,
        receivables,
        totalAssets,
        payables,
        equity
    };
}


// --- Database Seeding/Resetting ---
export async function resetDatabase() {
  if (!db) return;
  console.log('Starting database reset...');

  const batch = writeBatch(db);

  const collectionsToDelete = ['books', 'customers', 'sales', 'expenses', 'transactions', 'purchases', 'donations', 'metadata'];
  for (const coll of collectionsToDelete) {
    const snapshot = await getDocs(collection(db, coll));
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
  }
  
  await batch.commit();
  console.log('All collections cleared.');
  
  // Re-run batch for seeding
  const seedBatch = writeBatch(db);

  const metadataRef = doc(db, 'metadata', 'counters');
  seedBatch.set(metadataRef, { lastPurchaseNumber: 0 });

  await seedBatch.commit();
  console.log('Database reset and seeded with initial data.');

  // Revalidate all paths
  const paths = ['/dashboard', '/books', '/customers', '/sales', '/expenses', '/donations', '/receivables', '/payables', '/purchases', '/balance-sheet'];
  paths.forEach(path => revalidatePath(path));
}
