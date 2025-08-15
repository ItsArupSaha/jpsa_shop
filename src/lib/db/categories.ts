
'use server';

import {
    addDoc,
    collection,
    getDocs,
    orderBy,
    query,
    where
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ItemCategory } from '../types';

export async function getItemCategories(userId: string): Promise<ItemCategory[]> {
  if (!db || !userId) return [];
  const categoriesCollection = collection(db, 'users', userId, 'categories');
  const snapshot = await getDocs(query(categoriesCollection, orderBy('name')));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ItemCategory));
}

export async function addItemCategory(userId: string, categoryName: string): Promise<ItemCategory> {
  if (!db || !userId) throw new Error('Database not connected.');
  const categoriesCollection = collection(db, 'users', userId, 'categories');

  // Check if category already exists
  const q = query(categoriesCollection, where("name", "==", categoryName));
  const existing = await getDocs(q);
  if (!existing.empty) {
    throw new Error(`Category "${categoryName}" already exists.`);
  }

  const newDocRef = await addDoc(categoriesCollection, { name: categoryName });
  return { id: newDocRef.id, name: categoryName };
}
