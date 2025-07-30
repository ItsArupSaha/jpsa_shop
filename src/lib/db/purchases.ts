
'use server';

import {
    Timestamp,
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
    const purchasesCollection = collection(db, 'users', userId, 'purchases');
    const snapshot = await getDocs(query(purchasesCollection, orderBy('date', 'desc')));
    return snapshot.docs.map(docToPurchase);
}

export async function getPurchasesPaginated({ userId, pageLimit = 5, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ purchases: Purchase[], hasMore: boolean }> {
  if (!db || !userId) return { purchases: [], hasMore: false };

  const purchasesCollection = collection(db, 'users', userId, 'purchases');
  let q = query(
      purchasesCollection,
      orderBy('date', 'desc'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(purchasesCollection, lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const purchases = snapshot.docs.map(docToPurchase);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(purchasesCollection, orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { purchases, hasMore };
}

export async function addPurchase(userId: string, data: Omit<Purchase, 'id' | 'date' | 'totalAmount' | 'purchaseId'> & { dueDate: string }) {
  if (!db || !userId) return { success: false, error: 'Database not connected' };

  try {
      const result = await runTransaction(db, async (transaction) => {
          const userRef = doc(db, 'users', userId);
          const metadataRef = doc(userRef, 'metadata', 'counters');
          const purchasesCollection = collection(userRef, 'purchases');
          const booksCollection = collection(userRef, 'books');
          const expensesCollection = collection(userRef, 'expenses');
          const transactionsCollection = collection(userRef, 'transactions');
          
          const purchaseDate = new Date();

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

          const newPurchaseRef = doc(purchasesCollection);
          const purchaseData = {
              ...data,
              purchaseId,
              date: Timestamp.fromDate(purchaseDate),
              dueDate: Timestamp.fromDate(new Date(data.dueDate)),
              totalAmount: totalAmount,
          };
          transaction.set(newPurchaseRef, purchaseData);
          transaction.set(metadataRef, { lastPurchaseNumber: newPurchaseNumber }, { merge: true });

          for (const item of data.items) {
              if (item.category === 'Book') {
                  const q = query(booksCollection, where("title", "==", item.itemName));
                  const bookSnapshot = await getDocs(q); 

                  if (!bookSnapshot.empty) {
                      const bookDoc = bookSnapshot.docs[0];
                      const currentStock = bookDoc.data().stock || 0;
                      transaction.update(bookDoc.ref, { stock: currentStock + item.quantity });
                  } else {
                      const newBookRef = doc(booksCollection);
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
              transaction.set(doc(expensesCollection), expenseData);
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
                  transaction.set(doc(expensesCollection), expenseData);
              }

              if (payableAmount > 0) {
                  const payableData = {
                      description: `Balance for Purchase ${purchaseId} from ${data.supplier}`,
                      amount: payableAmount,
                      dueDate: Timestamp.fromDate(new Date(data.dueDate)),
                      status: 'Pending' as const,
                      type: 'Payable' as const,
                  };
                  transaction.set(doc(transactionsCollection), payableData);
              }
          } else if (data.paymentMethod === 'Due') {
              const payableData = {
                  description: `Purchase ${purchaseId} from ${data.supplier}`,
                  amount: totalAmount,
                  dueDate: Timestamp.fromDate(new Date(data.dueDate)),
                  status: 'Pending' as const,
                  type: 'Payable' as const,
              };
              transaction.set(doc(transactionsCollection), payableData);
          }

          return { success: true, purchase: { id: newPurchaseRef.id, ...purchaseData, date: purchaseDate.toISOString(), dueDate: data.dueDate } };
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
