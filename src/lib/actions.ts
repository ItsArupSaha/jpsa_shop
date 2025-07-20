
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

export async function addBook(data: Omit<Book, 'id'>) {
  if (!db) return;
  await addDoc(collection(db, 'books'), data);
  revalidatePath('/books');
  revalidatePath('/balance-sheet');
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

    return customersWithBalances.filter(c => c.dueBalance > 0.01);
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
                  // This get needs to happen outside transaction, but we can't.
                  // This is a limitation. We'll query before the transaction.
                  // For now, we will assume this might not be perfectly atomic.
                  // A better implementation would use a different data model.
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

          return { success: true };
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

export async function addExpense(data: Omit<Expense, 'id' | 'date'> & { date: Date }) {
    if (!db) return;
    const expenseData = {
        ...data,
        date: Timestamp.fromDate(data.date),
    };
    await addDoc(collection(db, 'expenses'), expenseData);
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
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

export async function addDonation(data: Omit<Donation, 'id' | 'date'> & { date: Date }) {
  if (!db) return;
  const donationData = {
      ...data,
      date: Timestamp.fromDate(data.date),
  };
  await addDoc(collection(db, 'donations'), donationData);
  revalidatePath('/donations');
  revalidatePath('/balance-sheet');
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
    revalidatePath('/balance-sheet');
    if (data.customerId) {
      revalidatePath(`/customers/${data.customerId}`);
    }
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
    console.log(`Starting database reset...`);
    
    const batch = writeBatch(db);

    const collections = ['books', 'customers', 'sales', 'expenses', 'transactions', 'purchases', 'donations', 'metadata'];
    for (const coll of collections) {
      const snapshot = await getDocs(collection(db, coll));
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
    }
    console.log(`Cleared all collections...`);

    const metadataRef = doc(db, 'metadata', 'counters');
    batch.set(metadataRef, { lastPurchaseNumber: 0 });

    const walkInCustomer: Omit<Customer, 'id'> = {
        name: 'Walk-in Customer',
        phone: 'N/A',
        address: 'N/A',
        openingBalance: 0,
    };
    const customerRef = doc(collection(db, 'customers'));
    batch.set(customerRef, walkInCustomer);
    
    console.log("Reset purchase counter and added walk-in customer.");

    await batch.commit();
    console.log(`Database reset successfully!`);

    revalidatePath('/dashboard');
    revalidatePath('/books');
    revalidatePath('/customers');
    revalidatePath('/sales');
    revalidatePath('/expenses');
    revalidatePath('/donations');
    revalidatePath('/receivables');
    revalidatePath('/payables');
    revalidatePath('/purchases');
    revalidatePath('/balance-sheet');
}
