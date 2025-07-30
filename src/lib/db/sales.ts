
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
import type { Book, Metadata, Sale, SaleItem } from '../types';
import { docToSale } from './utils';

// --- Sales Actions ---
export async function getSales(userId: string): Promise<Sale[]> {
    if (!db || !userId) return [];
    const salesCollection = collection(db, 'users', userId, 'sales');
    const snapshot = await getDocs(query(salesCollection, orderBy('date', 'desc')));
    return snapshot.docs.map(docToSale);
}

export async function getSalesPaginated({ userId, pageLimit = 5, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ sales: Sale[], hasMore: boolean }> {
  if (!db || !userId) return { sales: [], hasMore: false };

  const salesCollection = collection(db, 'users', userId, 'sales');
  let q = query(
      salesCollection,
      orderBy('date', 'desc'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(salesCollection, lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const sales = snapshot.docs.map(docToSale);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(salesCollection, orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { sales, hasMore };
}


export async function getSalesForCustomer(userId: string, customerId: string): Promise<Sale[]> {
  if (!db || !userId) return [];
  const salesCollection = collection(db, 'users', userId, 'sales');
  const q = query(
      salesCollection,
      where('customerId', '==', customerId),
      orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToSale);
}

export async function getSalesForMonth(userId: string, year: number, month: number): Promise<Sale[]> {
    if (!db || !userId) return [];
    const salesCollection = collection(db, 'users', userId, 'sales');
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const q = query(
        salesCollection,
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToSale);
}

export async function addSale(
    userId: string,
    data: Omit<Sale, 'id' | 'saleId' | 'date' | 'subtotal' | 'total'>
  ): Promise<{ success: boolean; error?: string; sale?: Sale }> {
    if (!db || !userId) return { success: false, error: "Database not configured." };
  
    try {
      const result = await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const metadataRef = doc(userRef, 'metadata', 'counters');
        const booksCollection = collection(userRef, 'books');
        const customersCollection = collection(userRef, 'customers');
        const salesCollection = collection(userRef, 'sales');
        const transactionsCollection = collection(userRef, 'transactions');

        const saleDate = new Date();
        const bookRefs = data.items.map(item => doc(booksCollection, item.bookId));
        const customerRef = doc(customersCollection, data.customerId);
        
        const [metadataDoc, ...bookDocs] = await Promise.all([
            transaction.get(metadataRef),
            ...bookRefs.map(ref => transaction.get(ref)),
        ]);
        const customerDoc = await transaction.get(customerRef);

        if (!customerDoc.exists()) {
            throw new Error(`Customer with id ${data.customerId} does not exist!`);
        }

        const lastSaleNumber = (metadataDoc.data() as Metadata)?.lastSaleNumber || 0;
        const newSaleNumber = lastSaleNumber + 1;
        const saleId = `SALE-${String(newSaleNumber).padStart(4, '0')}`;
        
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
  
        const newSaleRef = doc(salesCollection);
        const saleDataToSave: Omit<Sale, 'id' | 'date'> & { date: Timestamp } = {
          ...data,
          saleId,
          items: itemsWithPrices,
          subtotal: calculatedSubtotal,
          total: calculatedTotal,
          date: Timestamp.fromDate(saleDate),
        };
        transaction.set(newSaleRef, saleDataToSave);
        transaction.set(metadataRef, { lastSaleNumber: newSaleNumber }, { merge: true });
  
        for (let i = 0; i < bookDocs.length; i++) {
          const saleItem = data.items[i];
          const newStock = bookDocs[i].data()!.stock - saleItem.quantity;
          transaction.update(bookRefs[i], { stock: newStock });
        }
  
        if (data.paymentMethod === 'Due' || data.paymentMethod === 'Split') {
          let dueAmount = calculatedTotal;
          if(data.paymentMethod === 'Split' && data.amountPaid) {
            dueAmount = calculatedTotal - data.amountPaid;

            // Record the asset from the partial payment
            const paymentTransactionData = {
                description: `Partial payment for ${saleId}`,
                amount: data.amountPaid,
                dueDate: Timestamp.fromDate(new Date()),
                status: 'Paid' as const,
                type: 'Receivable' as const,
                paymentMethod: data.splitPaymentMethod, // Use the selected method
                customerId: data.customerId
            };
            transaction.set(doc(transactionsCollection), paymentTransactionData);
          }

          if (dueAmount > 0) {
              const currentDue = customerDoc.data()?.dueBalance || 0;
              transaction.update(customerRef, { dueBalance: currentDue + dueAmount });

              const receivableData = {
                description: `Due from ${saleId}`,
                amount: dueAmount,
                dueDate: Timestamp.fromDate(new Date()),
                status: 'Pending' as const,
                type: 'Receivable' as const,
                customerId: data.customerId
              };
              transaction.set(doc(transactionsCollection), receivableData);
          }
        }
  
        const saleForClient: Sale = {
          id: newSaleRef.id,
          ...saleDataToSave,
          date: saleDate.toISOString(),
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
