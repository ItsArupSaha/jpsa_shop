
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
    startAfter,
    where
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { Book, Metadata, Purchase } from '../types';
import { docToPurchase } from './utils';

// --- Purchases Actions ---
export async function getPurchases(userId: string): Promise<Purchase[]> {
    if (!db || !userId) return [];
    const purchasesRef = collection(db, 'users', userId, 'purchases');
    const snapshot = await getDocs(query(purchasesRef, orderBy('date', 'desc')));
    return snapshot.docs.map(docToPurchase);
}

export async function getPurchasesPaginated({ userId, pageLimit = 10, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ purchases: Purchase[], hasMore: boolean }> {
  if (!db || !userId) return { purchases: [], hasMore: false };
  const purchasesRef = collection(db, 'users', userId, 'purchases');

  let q = query(
      purchasesRef,
      orderBy('date', 'desc'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(purchasesRef, lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const purchases = snapshot.docs.map(docToPurchase);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(purchasesRef, orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { purchases, hasMore };
}

export async function addPurchase(userId: string, data: Omit<Purchase, 'id' | 'date' | 'totalAmount' | 'purchaseId' | 'dueDate'> & { dueDate: Date }) {
  if (!db || !userId) return { success: false, error: 'Database not connected or user not authenticated' };

  try {
      const result = await runTransaction(db, async (transaction) => {
          const userRef = doc(db, 'users', userId);
          const purchaseDate = new Date();
          const metadataRef = doc(userRef, 'metadata', 'counters');

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

          const newPurchaseRef = doc(collection(userRef, 'purchases'));
          const purchaseData = {
              ...data,
              purchaseId,
              date: Timestamp.fromDate(purchaseDate),
              dueDate: Timestamp.fromDate(data.dueDate),
              totalAmount: totalAmount,
          };
          transaction.set(newPurchaseRef, purchaseData);
          transaction.set(metadataRef, { lastPurchaseNumber: newPurchaseNumber }, { merge: true });

          const booksCollectionRef = collection(userRef, 'books');
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

          const transactionsCollectionRef = collection(userRef, 'transactions');
          const expensesCollectionRef = collection(userRef, 'expenses');

          if (data.paymentMethod === 'Cash' || data.paymentMethod === 'Bank') {
              const expenseData = {
                  description: `Payment for Purchase ${purchaseId}`,
                  amount: totalAmount,
                  date: Timestamp.fromDate(new Date()),
                  paymentMethod: data.paymentMethod,
              };
              transaction.set(doc(expensesCollectionRef), expenseData);
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
                  transaction.set(doc(expensesCollectionRef), expenseData);
              }

              if (payableAmount > 0) {
                  const payableData = {
                      description: `Balance for Purchase ${purchaseId} from ${data.supplier}`,
                      amount: payableAmount,
                      dueDate: Timestamp.fromDate(data.dueDate),
                      status: 'Pending' as const,
                      type: 'Payable' as const,
                  };
                  transaction.set(doc(transactionsCollectionRef), payableData);
              }
          } else if (data.paymentMethod === 'Due') {
              const payableData = {
                  description: `Purchase ${purchaseId} from ${data.supplier}`,
                  amount: totalAmount,
                  dueDate: Timestamp.fromDate(data.dueDate),
                  status: 'Pending' as const,
                  type: 'Payable' as const,
              };
              transaction.set(doc(transactionsCollectionRef), payableData);
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
