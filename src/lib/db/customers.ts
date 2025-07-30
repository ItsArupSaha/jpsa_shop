
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
export async function getCustomers(): Promise<Customer[]> {
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, 'customers'), orderBy('name')));
  return snapshot.docs.map(docToCustomer);
}

export async function getCustomersPaginated({ pageLimit = 5, lastVisibleId }: { pageLimit?: number, lastVisibleId?: string }): Promise<{ customers: Customer[], hasMore: boolean }> {
    if (!db) return { customers: [], hasMore: false };

    let q = query(
        collection(db, 'customers'),
        orderBy('name'),
        limit(pageLimit)
    );

    if (lastVisibleId) {
        const lastVisibleDoc = await getDoc(doc(db, 'customers', lastVisibleId));
        if (lastVisibleDoc.exists()) {
            q = query(q, startAfter(lastVisibleDoc));
        }
    }

    const snapshot = await getDocs(q);
    const customers = snapshot.docs.map(docToCustomer);

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    let hasMore = false;
    if (lastDoc) {
        const nextQuery = query(collection(db, 'customers'), orderBy('name'), startAfter(lastDoc), limit(1));
        const nextSnapshot = await getDocs(nextQuery);
        hasMore = !nextSnapshot.empty;
    }

    return { customers, hasMore };
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

    const q = query(collection(db, 'customers'), where('dueBalance', '>', 0), orderBy('dueBalance', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(d => ({ ...docToCustomer(d), dueBalance: d.data().dueBalance } as CustomerWithDue));
}

export async function getCustomersWithDueBalancePaginated({ pageLimit = 5, lastVisible }: { pageLimit?: number, lastVisible?: { id: string, dueBalance: number } }): Promise<{ customersWithDue: CustomerWithDue[], hasMore: boolean }> {
  if (!db) return { customersWithDue: [], hasMore: false };

  const allCustomersWithDue = await getCustomersWithDueBalance();
  
  let startIndex = 0;
  if (lastVisible) {
      startIndex = allCustomersWithDue.findIndex(c => c.id === lastVisible.id) + 1;
  }

  const paginatedCustomers = allCustomersWithDue.slice(startIndex, startIndex + pageLimit);
  const hasMore = startIndex + pageLimit < allCustomersWithDue.length;

  return { customersWithDue: paginatedCustomers, hasMore };
}


export async function addCustomer(data: Omit<Customer, 'id' | 'dueBalance'>) {
  if (!db) return;
  const dataWithDue = { ...data, dueBalance: data.openingBalance || 0 };
  const newDocRef = await addDoc(collection(db, 'customers'), dataWithDue);
  revalidatePath('/customers');
  return { id: newDocRef.id, ...dataWithDue };
}

export async function updateCustomer(id: string, data: Omit<Customer, 'id' | 'dueBalance'>) {
  if (!db) return;
  const dataWithDue = { ...data, dueBalance: data.openingBalance || 0 };
  await updateDoc(doc(db, 'customers', id), dataWithDue);
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
