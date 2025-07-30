
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
export async function getExpenses(userId: string): Promise<Expense[]> {
    if (!db || !userId) return [];
    const expensesCollection = collection(db, 'users', userId, 'expenses');
    const snapshot = await getDocs(query(expensesCollection, orderBy('date', 'desc')));
    return snapshot.docs.map(docToExpense);
}

export async function getExpensesPaginated({ userId, pageLimit = 5, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ expenses: Expense[], hasMore: boolean }> {
  if (!db || !userId) return { expenses: [], hasMore: false };

  const expensesCollection = collection(db, 'users', userId, 'expenses');
  let q = query(
      expensesCollection,
      orderBy('date', 'desc'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(expensesCollection, lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const expenses = snapshot.docs.map(docToExpense);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(expensesCollection, orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { expenses, hasMore };
}

export async function getExpensesForMonth(userId: string, year: number, month: number): Promise<Expense[]> {
    if (!db || !userId) return [];
    const expensesCollection = collection(db, 'users', userId, 'expenses');
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const q = query(
        expensesCollection,
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToExpense);
}

export async function addExpense(userId: string, data: Omit<Expense, 'id' | 'date'> & { date: Date }): Promise<Expense> {
    if (!db || !userId) throw new Error("Database not connected");
    const expensesCollection = collection(db, 'users', userId, 'expenses');
    const expenseData = {
        ...data,
        date: Timestamp.fromDate(data.date),
    };
    const newDocRef = await addDoc(expensesCollection, expenseData);
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
    return { ...data, id: newDocRef.id, date: data.date.toISOString() };
}

export async function deleteExpense(userId: string, id: string) {
    if (!db || !userId) return;
    const expenseRef = doc(db, 'users', userId, 'expenses', id);
    await deleteDoc(expenseRef);
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    revalidatePath('/balance-sheet');
}
