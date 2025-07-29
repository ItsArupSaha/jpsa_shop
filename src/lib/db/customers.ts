
'use server';

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    startAfter,
    updateDoc,
    where
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { Customer, CustomerWithDue } from '../types';
import { docToCustomer } from './utils';

// --- Customers Actions ---
export async function getCustomers(userId: string): Promise<Customer[]> {
  if (!db || !userId) return [];
  const customersRef = collection(db, 'users', userId, 'customers');
  const snapshot = await getDocs(query(customersRef, orderBy('name')));
  return snapshot.docs.map(docToCustomer);
}

export async function getCustomersPaginated({ userId, pageLimit = 10, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ customers: Customer[], hasMore: boolean }> {
    if (!db || !userId) return { customers: [], hasMore: false };
    const customersRef = collection(db, 'users', userId, 'customers');

    let q = query(
        customersRef,
        orderBy('name'),
        limit(pageLimit)
    );

    if (lastVisibleId) {
        const lastVisibleDoc = await getDoc(doc(customersRef, lastVisibleId));
        if (lastVisibleDoc.exists()) {
            q = query(q, startAfter(lastVisibleDoc));
        }
    }

    const snapshot = await getDocs(q);
    const customers = snapshot.docs.map(docToCustomer);

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    let hasMore = false;
    if (lastDoc) {
        const nextQuery = query(customersRef, orderBy('name'), startAfter(lastDoc), limit(1));
        const nextSnapshot = await getDocs(nextQuery);
        hasMore = !nextSnapshot.empty;
    }

    return { customers, hasMore };
}

export async function getCustomerById(userId: string, id: string): Promise<Customer | null> {
    if (!db || !userId) return null;
    const docRef = doc(db, 'users', userId, 'customers', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docToCustomer(docSnap);
    } else {
        return null;
    }
}

export async function getCustomersWithDueBalance(userId: string): Promise<CustomerWithDue[]> {
    if (!db || !userId) return [];
    const customersRef = collection(db, 'users', userId, 'customers');
    const q = query(customersRef, where('dueBalance', '>', 0), orderBy('dueBalance', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(d => ({ ...docToCustomer(d), dueBalance: d.data().dueBalance } as CustomerWithDue));
}

export async function getCustomersWithDueBalancePaginated({ userId, pageLimit = 10, lastVisible }: { userId: string, pageLimit?: number, lastVisible?: { id: string, dueBalance: number } }): Promise<{ customersWithDue: CustomerWithDue[], hasMore: boolean }> {
  if (!db || !userId) return { customersWithDue: [], hasMore: false };

  const allCustomersWithDue = await getCustomersWithDueBalance(userId);
  
  let startIndex = 0;
  if (lastVisible) {
      startIndex = allCustomersWithDue.findIndex(c => c.id === lastVisible.id) + 1;
  }

  const paginatedCustomers = allCustomersWithDue.slice(startIndex, startIndex + pageLimit);
  const hasMore = startIndex + pageLimit < allCustomersWithDue.length;

  return { customersWithDue: paginatedCustomers, hasMore };
}

export async function addCustomer(userId: string, data: Omit<Customer, 'id' | 'dueBalance'>) {
  if (!db || !userId) throw new Error("Database not connected or user not authenticated.");
  const customersRef = collection(db, 'users', userId, 'customers');
  const dataWithDue = { ...data, dueBalance: data.openingBalance || 0 };
  const newDocRef = await addDoc(customersRef, dataWithDue);
  revalidatePath('/customers');
  return { id: newDocRef.id, ...dataWithDue, dueBalance: dataWithDue.dueBalance };
}

export async function updateCustomer(userId: string, id: string, data: Omit<Customer, 'id' | 'dueBalance'>) {
  if (!db || !userId) return;
  const customerRef = doc(db, 'users', userId, 'customers', id);
  const dataWithDue = { ...data, dueBalance: data.openingBalance || 0 };
  await updateDoc(customerRef, dataWithDue);
  revalidatePath('/customers');
  revalidatePath('/receivables');
  revalidatePath(`/customers/${id}`);
}

export async function deleteCustomer(userId: string, id: string) {
  if (!db || !userId) return;
  const customerRef = doc(db, 'users', userId, 'customers', id);
  await deleteDoc(customerRef);
  revalidatePath('/customers');
  revalidatePath('/receivables');
}
