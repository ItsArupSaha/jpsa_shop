'use server';

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    updateDoc
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

import { db } from '../firebase';
import type { Category } from '../types';

// --- Categories Actions ---
export async function getCategories(userId: string): Promise<Category[]> {
  if (!db || !userId) return [];
  const categoriesCollection = collection(db, 'users', userId, 'categories');
  const snapshot = await getDocs(query(categoriesCollection, orderBy('name')));
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      createdAt: data.createdAt?.toDate?.() || new Date()
    } as Category;
  });
}

export async function addCategory(userId: string, data: Omit<Category, 'id' | 'createdAt'>) {
  if (!db || !userId) return;
  const categoriesCollection = collection(db, 'users', userId, 'categories');
  const newDocRef = await addDoc(categoriesCollection, {
    ...data,
    createdAt: new Date()
  });
  revalidatePath('/items');
  return { id: newDocRef.id, ...data, createdAt: new Date() };
}

export async function updateCategory(userId: string, id: string, data: Partial<Omit<Category, 'id' | 'createdAt'>>) {
  if (!db || !userId) return;
  const categoryRef = doc(db, 'users', userId, 'categories', id);
  await updateDoc(categoryRef, data);
  revalidatePath('/items');
}

export async function deleteCategory(userId: string, id: string) {
  if (!db || !userId) return;
  const categoryRef = doc(db, 'users', userId, 'categories', id);
  await deleteDoc(categoryRef);
  revalidatePath('/items');
}

// Initialize default categories for new users
export async function initializeDefaultCategories(userId: string) {
  if (!db || !userId) return;
  
  const categoriesCollection = collection(db, 'users', userId, 'categories');
  const snapshot = await getDocs(categoriesCollection);
  
  // Only add default categories if none exist
  if (snapshot.empty) {
    await addDoc(categoriesCollection, {
      name: 'Accessories',
      description: 'General accessories and supplies',
      createdAt: new Date()
    });
  }
}
