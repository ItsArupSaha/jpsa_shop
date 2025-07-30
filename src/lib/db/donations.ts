
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
export async function getDonations(userId: string): Promise<Donation[]> {
  if (!db || !userId) return [];
  const donationsCollection = collection(db, 'users', userId, 'donations');
  const snapshot = await getDocs(query(donationsCollection, orderBy('date', 'desc')));
  return snapshot.docs.map(docToDonation);
}

export async function getDonationsPaginated({ userId, pageLimit = 5, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ donations: Donation[], hasMore: boolean }> {
  if (!db || !userId) return { donations: [], hasMore: false };

  const donationsCollection = collection(db, 'users', userId, 'donations');
  let q = query(
      donationsCollection,
      orderBy('date', 'desc'),
      limit(pageLimit)
  );

  if (lastVisibleId) {
      const lastVisibleDoc = await getDoc(doc(donationsCollection, lastVisibleId));
      if (lastVisibleDoc.exists()) {
          q = query(q, startAfter(lastVisibleDoc));
      }
  }

  const snapshot = await getDocs(q);
  const donations = snapshot.docs.map(docToDonation);
  
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  let hasMore = false;
  if(lastDoc) {
    const nextQuery = query(donationsCollection, orderBy('date', 'desc'), startAfter(lastDoc), limit(1));
    const nextSnapshot = await getDocs(nextQuery);
    hasMore = !nextSnapshot.empty;
  }

  return { donations, hasMore };
}


export async function getDonationsForMonth(userId: string, year: number, month: number): Promise<Donation[]> {
    if (!db || !userId) return [];
    const donationsCollection = collection(db, 'users', userId, 'donations');
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const q = query(
        donationsCollection,
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToDonation);
}

export async function addDonation(userId: string, data: Omit<Donation, 'id' | 'date'> & { date: Date }): Promise<Donation> {
  if (!db || !userId) throw new Error("Database not connected.");
  const donationsCollection = collection(db, 'users', userId, 'donations');
  const donationData = {
      ...data,
      date: Timestamp.fromDate(data.date),
  };
  const newDocRef = await addDoc(donationsCollection, donationData);
  revalidatePath('/donations');
  revalidatePath('/balance-sheet');
  return { ...data, id: newDocRef.id, date: data.date.toISOString() };
}
