
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
import type { Transaction } from '../types';
import { docToTransaction } from './utils';

// --- Transactions (Receivables/Payables) Actions ---
export async function getTransactions(type: 'Receivable' | 'Payable'): Promise<Transaction[]> {
    if (!db) return [];
    const q = query(collection(db, 'transactions'), where('type', '==', type), where('status', '==', 'Pending'));
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(docToTransaction);
    // Sort in application code to avoid needing a composite index
    return transactions.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

export async function getTransactionsPaginated({ type, pageLimit = 5, lastVisibleId }: { type: 'Receivable' | 'Payable', pageLimit?: number, lastVisibleId?: string }): Promise<{ transactions: Transaction[], hasMore: boolean }> {
  if (!db) return { transactions: [], hasMore: false };
  let q = query(
    collection(db, 'transactions'), 
    where('type', '==', type), 
    where('status', '==', 'Pending'),
    // orderBy('dueDate', 'desc'), // Removing order to prevent needing a composite index
    limit(pageLimit)
  );

  if (lastVisibleId) {
    const lastVisibleDoc = await getDoc(doc(db, 'transactions', lastVisibleId));
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
        collection(db, 'transactions'), 
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

export async function getTransactionsForCustomer(
  customerId: string, 
  type: 'Receivable' | 'Payable', 
  options: { excludeSaleDues?: boolean } = {}
): Promise<Transaction[]> {
  if (!db) return [];
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
      collection(db, 'transactions'),
      ...qConstraints
  );

  const snapshot = await getDocs(q);
  let transactions = snapshot.docs.map(docToTransaction);

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
            const customerRef = doc(db!, 'customers', data.customerId);
            const customerDoc = await transaction.get(customerRef);

            if (!customerDoc.exists()) {
                throw new Error("Customer not found.");
            }

            const currentDue = customerDoc.data().dueBalance || 0;
            const newDue = currentDue - data.amount;
            
            transaction.update(customerRef, { dueBalance: newDue < 0 ? 0 : newDue });

            const paymentTransactionData = {
                description: `Payment from customer`,
                amount: data.amount,
                dueDate: Timestamp.fromDate(new Date()),
                status: 'Paid' as const,
                type: 'Receivable' as const,
                paymentMethod: data.paymentMethod,
                customerId: data.customerId
            };
            const newTransactionRef = doc(collection(db!, "transactions"));
            transaction.set(newTransactionRef, paymentTransactionData);

            // Settle pending receivables if any
            let amountToSettle = data.amount;
            const receivablesQuery = query(
                collection(db!, 'transactions'),
                where('type', '==', 'Receivable'),
                where('status', '==', 'Pending'),
                where('customerId', '==', data.customerId),
                orderBy('dueDate')
            );
            
            const pendingDocs = await getDocs(receivablesQuery);
            
            for (const docSnap of pendingDocs.docs) {
                if (amountToSettle <= 0) break;

                const receivable = docToTransaction(docSnap);
                const receivableRef = doc(db!, 'transactions', docSnap.id);
                
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
