
'use server';

import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  startAfter
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { Book, Metadata, SalesReturn } from '../types';
import { docToSalesReturn } from './utils';

// --- Sales Returns Actions ---
export async function getSalesReturns(userId: string): Promise<SalesReturn[]> {
    if (!db || !userId) return [];
    const returnsCollection = collection(db, 'users', userId, 'sales_returns');
    const snapshot = await getDocs(query(returnsCollection, orderBy('date', 'desc')));
    return snapshot.docs.map(docToSalesReturn);
}

export async function getSalesReturnsPaginated({ userId, pageLimit = 5, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ returns: SalesReturn[], hasMore: boolean }> {
  if (!db || !userId) return { returns: [], hasMore: false };

  const returnsCollection = collection(db, 'users', userId, 'sales_returns');
  let q = query(
      returnsCollection,
      orderBy('date', 'desc'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(returnsCollection, lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const returns = snapshot.docs.map(docToSalesReturn);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(returnsCollection, orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { returns, hasMore };
}

export async function addSalesReturn(
    userId: string,
    data: Omit<SalesReturn, 'id' | 'returnId' | 'date' | 'totalReturnValue'>
  ): Promise<{ success: boolean; error?: string; salesReturn?: SalesReturn }> {
    if (!db || !userId) return { success: false, error: "Database not configured." };
  
    try {
      const result = await runTransaction(db, async (transaction) => {
        const userRef = doc(db!, 'users', userId);
        const metadataRef = doc(userRef, 'metadata', 'counters');
        const booksCollection = collection(userRef, 'books');
        const customersCollection = collection(userRef, 'customers');
        const returnsCollection = collection(userRef, 'sales_returns');
        const expensesCollection = collection(userRef, 'expenses');

        const returnDate = new Date();
        const bookRefs = data.items.map(item => doc(booksCollection, item.bookId));
        const customerRef = doc(customersCollection, data.customerId);
        
        const [metadataDoc, customerDoc, ...bookDocs] = await Promise.all([
            transaction.get(metadataRef),
            transaction.get(customerRef),
            ...bookRefs.map(ref => transaction.get(ref)),
        ]);
        
        if (!customerDoc.exists()) throw new Error(`Customer with id ${data.customerId} does not exist!`);

        const metadata = metadataDoc.data() as Metadata;
        const lastReturnNumber = metadata?.lastReturnNumber || 0;
        const newReturnNumber = lastReturnNumber + 1;
        const returnId = `RTN-${String(newReturnNumber).padStart(4, '0')}`;
        
        let totalReturnValue = 0;
  
        for (let i = 0; i < data.items.length; i++) {
          const bookDoc = bookDocs[i];
          const returnItem = data.items[i];
  
          if (!bookDoc.exists()) throw new Error(`Book with id ${returnItem.bookId} does not exist!`);
          
          const bookData = bookDoc.data() as Book;
          const newStock = bookData.stock + returnItem.quantity;
          transaction.update(bookRefs[i], { stock: newStock });
          
          totalReturnValue += returnItem.price * returnItem.quantity;
        }
  
        const newReturnRef = doc(returnsCollection);
        const returnDataToSave = {
          ...data,
          returnId,
          totalReturnValue,
          date: Timestamp.fromDate(returnDate),
        };
        transaction.set(newReturnRef, returnDataToSave);
        transaction.set(metadataRef, { lastReturnNumber: newReturnNumber }, { merge: true });

        if (data.refundMethod === 'Adjust Due') {
            const currentDue = customerDoc.data()?.dueBalance || 0;
            transaction.update(customerRef, { dueBalance: currentDue - totalReturnValue });
        } else { // Cash or Bank Refund
            const expenseData = {
                description: `Refund for Return ${returnId}`,
                amount: totalReturnValue,
                date: Timestamp.fromDate(returnDate),
                paymentMethod: data.refundMethod,
            };
            transaction.set(doc(expensesCollection), expenseData);
        }
  
        const salesReturnForClient: SalesReturn = {
          id: newReturnRef.id,
          ...returnDataToSave,
          date: returnDate.toISOString(),
        };
  
        return { success: true, salesReturn: salesReturnForClient };
      });

      revalidatePath('/sales-returns');
      revalidatePath('/dashboard');
      revalidatePath('/books');
      revalidatePath('/receivables');
      revalidatePath('/balance-sheet');
      if (data.customerId) {
          revalidatePath(`/customers/${data.customerId}`);
      }
      return result;

    } catch (e) {
      console.error("Sales return creation failed: ", e);
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
}
