
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
import type { Book } from '../types';
import { docToBook } from './utils';

// --- Books Actions ---
export async function getBooks(userId: string): Promise<Book[]> {
  if (!db || !userId) return [];
  const booksRef = collection(db, 'users', userId, 'books');
  const snapshot = await getDocs(query(booksRef, orderBy('title')));
  return snapshot.docs.map(docToBook);
}

export async function getBooksPaginated({ userId, pageLimit = 10, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ books: Book[], hasMore: boolean }> {
  if (!db || !userId) return { books: [], hasMore: false };
  const booksRef = collection(db, 'users', userId, 'books');

  let q = query(
      booksRef,
      orderBy('title'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(booksRef, lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const books = snapshot.docs.map(docToBook);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(booksRef, orderBy('title'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { books, hasMore };
}

export async function addBook(userId: string, data: Omit<Book, 'id'>) {
  if (!db || !userId) throw new Error("Database not connected or user not authenticated.");
  const booksRef = collection(db, 'users', userId, 'books');
  const newDocRef = await addDoc(booksRef, data);
  revalidatePath('/books');
  revalidatePath('/balance-sheet');
  return { id: newDocRef.id, ...data };
}

export async function updateBook(userId: string, id: string, data: Omit<Book, 'id'>) {
  if (!db || !userId) return;
  const bookRef = doc(db, 'users', userId, 'books', id);
  await updateDoc(bookRef, data);
  revalidatePath('/books');
  revalidatePath('/balance-sheet');
}

export async function deleteBook(userId: string, id: string) {
  if (!db || !userId) return;
  const bookRef = doc(db, 'users', userId, 'books', id);
  await deleteDoc(bookRef);
  revalidatePath('/books');
  revalidatePath('/balance-sheet');
}
