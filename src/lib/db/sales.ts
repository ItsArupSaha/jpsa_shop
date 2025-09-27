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
  where,
  deleteDoc,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { Item, Metadata, Sale, SaleItem } from '../types';
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
    const q = query(salesCollection, where('customerId', '==', customerId));
    const snapshot = await getDocs(q);
    const sales = snapshot.docs.map(docToSale);
    // Sort in application code to avoid needing a composite index
    return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
    data: Omit<Sale, 'id' | 'saleId' | 'date' | 'subtotal' | 'total'> & { creditApplied?: number }
  ): Promise<{ success: boolean; error?: string; sale?: Sale }> {
    if (!db || !userId) return { success: false, error: "Database not configured." };
  
    try {
      const result = await runTransaction(db, async (transaction) => {
        const userRef = doc(db!, 'users', userId);
        const metadataRef = doc(userRef, 'metadata', 'counters');
        const itemsCollection = collection(userRef, 'items');
        const customersCollection = collection(userRef, 'customers');
        const salesCollection = collection(userRef, 'sales');
        const transactionsCollection = collection(userRef, 'transactions');

        const saleDate = new Date();
        const itemRefs = data.items.map(item => doc(itemsCollection, item.itemId));
        const customerRef = doc(customersCollection, data.customerId);
        
        const [metadataDoc, ...itemDocs] = await Promise.all([
            transaction.get(metadataRef),
            ...itemRefs.map(ref => transaction.get(ref)),
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
          const itemDoc = itemDocs[i];
          const saleItem = data.items[i];
  
          if (!itemDoc.exists()) {
            throw new Error(`Item with id ${saleItem.itemId} does not exist!`);
          }
          const itemData = itemDoc.data() as Item;
          if (itemData.stock < saleItem.quantity) {
            throw new Error(`Not enough stock for ${itemData.title}. Available: ${itemData.stock}, Requested: ${saleItem.quantity}`);
          }
          
          const price = itemData.sellingPrice;
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
        const totalAfterDiscount = calculatedSubtotal - discountAmount;
        
        const creditApplied = data.creditApplied || 0;
        const finalTotal = totalAfterDiscount - creditApplied;

        const newSaleRef = doc(salesCollection);
        const saleDataToSave: Omit<Sale, 'id' | 'date'> & { date: Timestamp, creditApplied?: number } = {
          ...data,
          saleId,
          items: itemsWithPrices,
          subtotal: calculatedSubtotal,
          total: totalAfterDiscount, // The sale total before credit
          date: Timestamp.fromDate(saleDate),
          creditApplied: creditApplied,
          paymentMethod: finalTotal <= 0 ? 'Paid by Credit' : data.paymentMethod,
        };
        transaction.set(newSaleRef, saleDataToSave);
        transaction.set(metadataRef, { lastSaleNumber: newSaleNumber }, { merge: true });
  
        for (let i = 0; i < itemDocs.length; i++) {
          const saleItem = data.items[i];
          const newStock = itemDocs[i].data()!.stock - saleItem.quantity;
          transaction.update(itemRefs[i], { stock: newStock });
        }

        const currentDue = customerDoc.data()?.dueBalance || 0;
        let finalDue = currentDue;

        // Apply credit
        if (creditApplied > 0) {
            finalDue += creditApplied;
        }
  
        if (data.paymentMethod === 'Due' || data.paymentMethod === 'Split') {
          let dueAmount = finalTotal;
          if(data.paymentMethod === 'Split' && data.amountPaid) {
            dueAmount = finalTotal - data.amountPaid;

            const paymentTransactionData = {
                description: `Partial payment for ${saleId}`,
                amount: data.amountPaid,
                dueDate: Timestamp.fromDate(new Date()),
                status: 'Paid' as const,
                type: 'Receivable' as const,
                paymentMethod: data.splitPaymentMethod,
                customerId: data.customerId
            };
            transaction.set(doc(transactionsCollection), paymentTransactionData);
          }

          if (dueAmount > 0) {
              finalDue += dueAmount;
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
        
        // Update customer balance if it changed
        if (finalDue !== currentDue) {
            transaction.update(customerRef, { dueBalance: finalDue });
        }
  
        const saleForClient: Sale = {
          id: newSaleRef.id,
          ...saleDataToSave,
          total: finalTotal, // Final total for client view
          date: saleDate.toISOString(),
        };
  
        return { success: true, sale: saleForClient };
      });

      revalidatePath('/sales');
      revalidatePath('/dashboard');
      revalidatePath('/items');
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

export async function deleteSale(userId: string, saleId: string): Promise<{ success: boolean; error?: string }> {
    if (!db || !userId) return { success: false, error: "Database not configured." };

    try {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db!, 'users', userId);
            const saleRef = doc(userRef, 'sales', saleId);
            const saleDoc = await transaction.get(saleRef);

            if (!saleDoc.exists()) {
                throw new Error("Sale not found.");
            }

            const saleData = saleDoc.data() as Sale;

            // 1. Restore item stock
            for (const item of saleData.items) {
                const itemRef = doc(userRef, 'items', item.itemId);
                transaction.update(itemRef, { stock: (await transaction.get(itemRef)).data()!.stock + item.quantity });
            }

            // 2. Adjust customer balance
            const customerRef = doc(userRef, 'customers', saleData.customerId);
            const customerDoc = await transaction.get(customerRef);
            if (customerDoc.exists()) {
                let balanceAdjustment = saleData.total;
                if(saleData.creditApplied) {
                    balanceAdjustment -= saleData.creditApplied;
                }
                const currentDue = customerDoc.data().dueBalance || 0;
                transaction.update(customerRef, { dueBalance: currentDue - balanceAdjustment });
            }

            // 3. Delete any associated receivables
            const transactionsCollection = collection(userRef, 'transactions');
            const receivableQuery = query(transactionsCollection, where('description', 'in', [`Due from ${saleData.saleId}`, `Partial payment for ${saleData.saleId}`]));
            const receivableDocs = await getDocs(receivableQuery);
            receivableDocs.forEach(doc => transaction.delete(doc.ref));

            // 4. Delete the sale document
            transaction.delete(saleRef);
        });

        revalidatePath('/sales');
        revalidatePath('/items');
        revalidatePath('/dashboard');
        revalidatePath('/receivables');
        revalidatePath('/balance-sheet');
        return { success: true };
    } catch (e) {
        console.error("Sale deletion failed: ", e);
        return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
}
