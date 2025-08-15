
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
    updateDoc
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

import { db } from '../firebase';
import type { Item } from '../types';
import { docToItem } from './utils';

// --- Items Actions ---
export async function getItems(userId: string): Promise<Item[]> {
  if (!db || !userId) return [];
  const itemsCollection = collection(db, 'users', userId, 'items');
  const snapshot = await getDocs(query(itemsCollection, orderBy('title')));
  return snapshot.docs.map(docToItem);
}

export async function getItemsPaginated({ userId, pageLimit = 5, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ items: Item[], hasMore: boolean }> {
  if (!db || !userId) return { items: [], hasMore: false };

  const itemsCollection = collection(db, 'users', userId, 'items');
  let q = query(
      itemsCollection,
      orderBy('title'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(itemsCollection, lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const items = snapshot.docs.map(docToItem);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(itemsCollection, orderBy('title'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { items, hasMore };
}

export async function addItem(userId: string, data: Omit<Item, 'id'>) {
  if (!db || !userId) return;
  const itemsCollection = collection(db, 'users', userId, 'items');
  const newDocRef = await addDoc(itemsCollection, data);
  revalidatePath('/items');
  revalidatePath('/balance-sheet');
  return { id: newDocRef.id, ...data };
}

export async function updateItem(userId: string, id: string, data: Omit<Item, 'id'>) {
  if (!db || !userId) return;
  const itemRef = doc(db, 'users', userId, 'items', id);
  await updateDoc(itemRef, data);
  revalidatePath('/items');
  revalidatePath('/balance-sheet');
}

export async function deleteItem(userId: string, id: string) {
  if (!db || !userId) return;
  const itemRef = doc(db, 'users', userId, 'items', id);
  await deleteDoc(itemRef);
  revalidatePath('/items');
  revalidatePath('/balance-sheet');
}
