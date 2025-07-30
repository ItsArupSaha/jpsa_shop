
'use server';

import {
    Timestamp,
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
    where
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import type { Expense } from '../types';
import { docToExpense } from './utils';

// --- Expenses Actions ---
export async function getExpenses(): Promise<Expense[]> {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));
    return snapshot.docs.map(docToExpense);
}

export async function getExpensesPaginated({ pageLimit = 5, lastVisibleId }: { pageLimit?: number, lastVisibleId?: string }): Promise<{ expenses: Expense[], hasMore: boolean }> {
  if (!db) return { expenses: [], hasMore: false };

  let q = query(
      collection(db, 'expenses'),
      orderBy('date', 'desc'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(db, 'expenses', lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const expenses = snapshot.docs.map(docToExpense);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(collection(db, 'expenses'), orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { expenses, hasMore };
}

export async function getExpensesForMonth(year: number, month: number): Promise<Expense[]> {
    if (!db) return [];
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const q = query(
        collection(db, 'expenses'),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToExpense);
}

export async function addExpense(data: Omit<Expense, 'id' | 'date'> & { date: Date }): Promise<Expense> {
    if (!db) throw new Error("Database not connected");
    const expenseData = {
        ...data,
        date: Timestamp.fromDate(data.date),
    };
    const newDocRef = await addDoc(collection(db, 'expenses'), expenseData);
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
    return { ...data, id: newDocRef.id, date: data.date.toISOString() };
}

export async function deleteExpense(id: string) {
    if (!db) return;
    await deleteDoc(doc(db, 'expenses', id));
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
}
