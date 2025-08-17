
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
  const donations = snapshot.docs.map(docToDonation);
  
  // Filter out transfer-related donations (they shouldn't affect profit calculation)
  // Also filter out initial capital contributions
  return donations.filter(donation => 
    !(donation.donorName === 'Internal Transfer' && donation.notes?.startsWith('Transfer from')) &&
    !(donation.donorName === 'Initial Capital')
  );
}

export async function getDonationsPaginated({ userId, pageLimit = 5, lastVisibleId }: { userId: string, pageLimit?: number, lastVisibleId?: string }): Promise<{ donations: Donation[], hasMore: boolean }> {
  if (!db || !userId) return { donations: [], hasMore: false };

  const donationsCollection = collection(db, 'users', userId, 'donations');
  // We have to filter client-side since we can't do a "not-equal" query on a field
  // while also ordering by another field without a composite index.
  // This is less efficient but acceptable for this specific "Initial Capital" case.
  const allDonations = await getDonations(userId);
  
  let startIndex = 0;
  if (lastVisibleId) {
    const lastIndex = allDonations.findIndex(d => d.id === lastVisibleId);
    if (lastIndex !== -1) {
      startIndex = lastIndex + 1;
    }
  }

  const paginatedDonations = allDonations.slice(startIndex, startIndex + pageLimit);
  const hasMore = startIndex + pageLimit < allDonations.length;

  return { donations: paginatedDonations, hasMore };
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
    const donations = snapshot.docs.map(docToDonation);
    
    // Filter out transfer-related and initial capital donations
    return donations.filter(donation => 
      !(donation.donorName === 'Internal Transfer' && donation.notes?.startsWith('Transfer from')) &&
      !(donation.donorName === 'Initial Capital')
    );
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
