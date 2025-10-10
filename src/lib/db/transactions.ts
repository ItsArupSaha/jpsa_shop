

'use server';

import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  startAfter,
  updateDoc,
  where
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { Transaction, Transfer } from '../types';
import { getCustomerById } from './customers';
import { docToTransaction, docToTransfer } from './utils';

// --- Transactions (Receivables/Payables) Actions ---
export async function getTransactions(userId: string, type: 'Receivable' | 'Payable'): Promise<Transaction[]> {
    if (!db || !userId) return [];
    const transactionsCollection = collection(db, 'users', userId, 'transactions');
    const q = query(transactionsCollection, where('type', '==', type), where('status', '==', 'Pending'));
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(docToTransaction);
    // Sort in application code to avoid needing a composite index
    return transactions.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

export async function getTransactionsPaginated({ userId, type, pageLimit = 5, lastVisibleId }: { userId: string, type: 'Receivable' | 'Payable', pageLimit?: number, lastVisibleId?: string }): Promise<{ transactions: Transaction[], hasMore: boolean }> {
  if (!db || !userId) return { transactions: [], hasMore: false };
  const transactionsCollection = collection(db, 'users', userId, 'transactions');
  let q = query(
    transactionsCollection, 
    where('type', '==', type), 
    where('status', '==', 'Pending'),
    // orderBy('dueDate', 'desc'), // Removing order to prevent needing a composite index
    limit(pageLimit)
  );

  if (lastVisibleId) {
    const lastVisibleDoc = await getDoc(doc(transactionsCollection, lastVisibleId));
    if (lastVisibleDoc.exists()) {
        q = query(q, startAfter(lastVisibleDoc));
    }
  }
  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(docToTransaction)
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());


  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if (lastDoc) {
    const nextQuery = query(
        transactionsCollection, 
        where('type', '==', type), 
        where('status', '==', 'Pending'),
        // orderBy('dueDate', 'desc'),
        startAfter(lastDoc), 
        limit(1)
    );
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }
  
  return { transactions, hasMore };
}

export async function getPaidReceivablesForDateRange(userId: string, fromDate: Date, toDate?: Date): Promise<Transaction[]> {
  if (!db || !userId) return [];
  const transactionsCollection = collection(db, 'users', userId, 'transactions');
  
  const finalToDate = toDate || fromDate;
  finalToDate.setHours(23, 59, 59, 999);

  // First get all paid receivables, then filter by date in application code
  const q = query(
    transactionsCollection,
    where('type', '==', 'Receivable'),
    where('status', '==', 'Paid')
  );

  const snapshot = await getDocs(q);
  const allTransactions = snapshot.docs.map(docToTransaction);
  
  // Filter by date range in application code to avoid composite index requirement
  const filteredTransactions = allTransactions.filter(transaction => {
    const transactionDate = new Date(transaction.dueDate);
    return transactionDate >= fromDate && transactionDate <= finalToDate;
  });

  const transactions = await Promise.all(filteredTransactions.map(async (transaction) => {
    if (transaction.customerId) {
        const customer = await getCustomerById(userId, transaction.customerId);
        return { ...transaction, customerName: customer?.name || 'Unknown' };
    }
    return transaction;
  }));

  return transactions.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}


export async function getTransactionsForCustomer(
  userId: string,
  customerId: string, 
  type: 'Receivable' | 'Payable', 
  options: { excludeSaleDues?: boolean } = {}
): Promise<Transaction[]> {
  if (!db || !userId) return [];
  const transactionsCollection = collection(db, 'users', userId, 'transactions');
  let qConstraints: any[] = [
    where('type', '==', type),
    where('customerId', '==', customerId)
  ];

  if (options.excludeSaleDues) {
    // This is a workaround for Firestore's lack of 'not-starts-with'
    // It assumes sale descriptions always start with "Due from Sale #"
    qConstraints.push(where('description', '>=', 'Payment from customer'));
  }
  
  const q = query(
      transactionsCollection,
      ...qConstraints
  );

  const snapshot = await getDocs(q);
  let transactions = snapshot.docs.map(docToTransaction);

  return transactions.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

export async function addTransaction(userId: string, data: Omit<Transaction, 'id' | 'dueDate' | 'status'> & { dueDate: Date }): Promise<Transaction> {
    if (!db || !userId) throw new Error("Database not connected");
    const transactionsCollection = collection(db, 'users', userId, 'transactions');
    const transactionData = {
        ...data,
        status: 'Pending' as const,
        dueDate: Timestamp.fromDate(data.dueDate),
    };
    const newDocRef = await addDoc(transactionsCollection, transactionData);
    revalidatePath(`/${data.type.toLowerCase()}s`);
    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
    if (data.customerId) {
      revalidatePath(`/customers/${data.customerId}`);
    }
    return { ...transactionData, id: newDocRef.id, dueDate: data.dueDate.toISOString() };
}

export async function addPayment(userId: string, data: { customerId: string, amount: number, paymentMethod: 'Cash' | 'Bank' }) {
    if (!db || !userId) throw new Error("Database not configured.");

    try {
        const result = await runTransaction(db, async (transaction) => {
            const userRef = doc(db!, 'users', userId);
            const customersCollection = collection(userRef, 'customers');
            const transactionsCollection = collection(userRef, 'transactions');

            const customerRef = doc(customersCollection, data.customerId);
            const customerDoc = await transaction.get(customerRef);

            if (!customerDoc.exists()) {
                throw new Error("Customer not found.");
            }

            const currentDue = customerDoc.data().dueBalance || 0;
            const newDue = currentDue - data.amount;
            
            transaction.update(customerRef, { dueBalance: newDue });

            const paymentTransactionRef = doc(transactionsCollection);
            const paymentTransactionData = {
                description: `Payment from customer`,
                amount: data.amount,
                dueDate: Timestamp.fromDate(new Date()),
                status: 'Paid' as const,
                type: 'Receivable' as const,
                paymentMethod: data.paymentMethod,
                customerId: data.customerId,
                recognizedProfit: 0,
            };
            
            let amountToSettle = data.amount;
            let totalRecognizedProfit = 0;

            const receivablesQuery = query(
                transactionsCollection,
                where('type', '==', 'Receivable'),
                where('status', '==', 'Pending'),
                where('customerId', '==', data.customerId)
            );
            
            const pendingDocs = await getDocs(receivablesQuery);
            
            const sortedPendingDocs = pendingDocs.docs
                .map(doc => ({ doc, data: docToTransaction(doc) }))
                .sort((a, b) => new Date(a.data.dueDate).getTime() - new Date(b.data.dueDate).getTime());
            
            for (const { doc: docSnap, data: receivable } of sortedPendingDocs) {
                if (amountToSettle <= 0) break;

                const receivableRef = doc(transactionsCollection, docSnap.id);
                const receivableAmount = receivable.amount;
                const remainingProfit = receivable.remainingProfit || 0;
                
                const paymentForThisReceivable = Math.min(amountToSettle, receivableAmount);
                const profitToRecognize = remainingProfit > 0 && receivableAmount > 0 
                    ? remainingProfit * (paymentForThisReceivable / receivableAmount)
                    : 0;

                totalRecognizedProfit += profitToRecognize;

                if (paymentForThisReceivable < receivableAmount) {
                    // Partially paying off this receivable
                    transaction.update(receivableRef, { 
                        amount: receivableAmount - paymentForThisReceivable,
                        remainingProfit: remainingProfit - profitToRecognize,
                     });
                } else {
                    // Fully paying off this receivable
                    transaction.update(receivableRef, { 
                        status: 'Paid',
                        remainingProfit: 0,
                    });
                }
                amountToSettle -= paymentForThisReceivable;
            }

            // Set the total recognized profit on the main payment transaction
            paymentTransactionData.recognizedProfit = totalRecognizedProfit;
            transaction.set(paymentTransactionRef, paymentTransactionData);

            return { success: true };
        });

        revalidatePath('/receivables');
        revalidatePath('/dashboard');
        revalidatePath('/balance-sheet');
        revalidatePath('/reports');
        if (data.customerId) {
            revalidatePath(`/customers/${data.customerId}`);
        }
        return result;

    } catch (e) {
        console.error("Payment processing failed: ", e);
        throw e instanceof Error ? e : new Error('An unknown error occurred during payment processing.');
    }
}


export async function getTransfersPaginated({ userId, pageLimit = 5, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ transfers: Transfer[], hasMore: boolean }> {
    if (!db || !userId) return { transfers: [], hasMore: false };
  
    const transfersCollection = collection(db, 'users', userId, 'transfers');
    let q = query(
        transfersCollection,
        orderBy('date', 'desc'),
        limit(pageLimit)
    );
  
    if (lastVisibleId) {
        const lastVisibleDoc = await getDoc(doc(transfersCollection, lastVisibleId));
        if (lastVisibleDoc.exists()) {
            q = query(q, startAfter(lastVisibleDoc));
        }
    }
  
    const snapshot = await getDocs(q);
    const transfers = snapshot.docs.map(docToTransfer);
    
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    let hasMore = false;
    if(lastDoc) {
      const nextQuery = query(transfersCollection, orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
      const nextSnapshot = await getDocs(nextQuery);
      hasMore = !nextSnapshot.empty;
    }
  
    return { transfers, hasMore };
}

export async function recordTransfer(
  userId: string, 
  data: { 
    amount: number; 
    from: 'Cash' | 'Bank'; 
    to: 'Cash' | 'Bank'; 
    date: Date 
  }
) {
  if (!db || !userId) throw new Error("Database not connected");
  if (data.from === data.to) throw new Error("Source and destination cannot be the same.");

  // Simple transfer: just record it in a transfers collection for audit purposes
  // No fake expenses or donations - just track the movement
  const transfersCollection = collection(db, 'users', userId, 'transfers');
  
  const transferData = {
    amount: data.amount,
    from: data.from,
    to: data.to,
    date: Timestamp.fromDate(data.date),
    description: `Transfer from ${data.from} to ${data.to}`
  };
  
  await addDoc(transfersCollection, transferData);
  
  revalidatePath('/balance-sheet');
  revalidatePath('/dashboard');
}


export async function updateTransactionStatus(userId: string, id: string, status: 'Pending' | 'Paid', type: 'Receivable' | 'Payable') {
    if (!db || !userId) return;
    const transRef = doc(db, 'users', userId, 'transactions', id);
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

export async function deleteTransaction(userId: string, id: string, type: 'Receivable' | 'Payable') {
    if (!db || !userId) return;
    const transRef = doc(db, 'users', userId, 'transactions', id);
    await deleteDoc(transRef);
    revalidatePath(`/${type.toLowerCase()}s`);
    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
}

export async function getTransactionsForMonth(userId: string, year: number, month: number): Promise<Transaction[]> {
    if (!db || !userId) return [];
    const transactionsCollection = collection(db, 'users', userId, 'transactions');
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const q = query(
        transactionsCollection,
        where('dueDate', '>=', Timestamp.fromDate(startDate)),
        where('dueDate', '<=', Timestamp.fromDate(endDate))
    );
    const snapshot = await getDocs(q);
    // Sort by dueDate in application code to avoid needing a composite index
    return snapshot.docs
        .map(docToTransaction)
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

    
