
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
export async function getBooks(): Promise<Book[]> {
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, 'books'), orderBy('title')));
  return snapshot.docs.map(docToBook);
}

export async function getBooksPaginated({ pageLimit = 5, lastVisibleId }: { pageLimit?: number, lastVisibleId?: string }): Promise<{ books: Book[], hasMore: boolean }> {
  if (!db) return { books: [], hasMore: false };

  let q = query(
      collection(db, 'books'),
      orderBy('title'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(db, 'books', lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const books = snapshot.docs.map(docToBook);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(collection(db, 'books'), orderBy('title'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { books, hasMore };
}

export async function addBook(data: Omit<Book, 'id'>) {
  if (!db) return;
  const newDocRef = await addDoc(collection(db, 'books'), data);
  revalidatePath('/books');
  revalidatePath('/balance-sheet');
  return { id: newDocRef.id, ...data };
}

export async function updateBook(id: string, data: Omit<Book, 'id'>) {
  if (!db) return;
  await updateDoc(doc(db, 'books', id), data);
  revalidatePath('/books');
  revalidatePath('/balance-sheet');
}

export async function deleteBook(id: string) {
  if (!db) return;
  await deleteDoc(doc(db, 'books', id));
  revalidatePath('/books');
  revalidatePath('/balance-sheet');
}
