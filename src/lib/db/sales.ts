
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
import type { Book, Sale, SaleItem } from '../types';
import { docToSale } from './utils';

// --- Sales Actions ---
export async function getSales(): Promise<Sale[]> {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, 'sales'), orderBy('date', 'desc')));
    return snapshot.docs.map(docToSale);
}

export async function getSalesPaginated({ pageLimit = 5, lastVisibleId }: { pageLimit?: number, lastVisibleId?: string }): Promise<{ sales: Sale[], hasMore: boolean }> {
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
        const bookRefs = data.items.map(item => doc(db!, 'books', item.bookId));
        const customerRef = doc(db!, 'customers', data.customerId);
        
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
  
        const newSaleRef = doc(collection(db!, "sales"));
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
              const currentDue = customerDoc.data()?.dueBalance || 0;
              transaction.update(customerRef, { dueBalance: currentDue + dueAmount });

              const receivableData = {
                description: `Due from Sale #${newSaleRef.id.slice(0, 6)}`,
                amount: dueAmount,
                dueDate: Timestamp.fromDate(new Date()),
                status: 'Pending' as const,
                type: 'Receivable' as const,
                customerId: data.customerId
              };
              const newTransactionRef = doc(collection(db!, "transactions"));
              transaction.set(newTransactionRef, receivableData);
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
