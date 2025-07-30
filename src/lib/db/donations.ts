
'use server';

import {
    Timestamp,
    addDoc,
    collection,
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
import type { Donation } from '../types';
import { docToDonation } from './utils';

// --- Donations Actions ---
export async function getDonations(): Promise<Donation[]> {
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, 'donations'), orderBy('date', 'desc')));
  return snapshot.docs.map(docToDonation);
}

export async function getDonationsPaginated({ pageLimit = 5, lastVisibleId }: { pageLimit?: number, lastVisibleId?: string }): Promise<{ donations: Donation[], hasMore: boolean }> {
  if (!db) return { donations: [], hasMore: false };

  let q = query(
      collection(db, 'donations'),
      orderBy('date', 'desc'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(db, 'donations', lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const donations = snapshot.docs.map(docToDonation);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(collection(db, 'donations'), orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { donations, hasMore };
}


export async function getDonationsForMonth(year: number, month: number): Promise<Donation[]> {
    if (!db) return [];
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const q = query(
        collection(db, 'donations'),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToDonation);
}

export async function addDonation(data: Omit<Donation, 'id' | 'date'> & { date: Date }): Promise<Donation> {
  if (!db) throw new Error("Database not connected.");
  const donationData = {
      ...data,
      date: Timestamp.fromDate(data.date),
  };
  const newDocRef = await addDoc(collection(db, 'donations'), donationData);
  revalidatePath('/donations');
  revalidatePath('/balance-sheet');
  return { ...data, id: newDocRef.id, date: data.date.toISOString() };
}
