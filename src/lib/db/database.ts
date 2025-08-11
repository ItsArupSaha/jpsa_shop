
'use server';

import { collection, doc, getDocs, writeBatch, serverTimestamp, getDoc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import { DUMMY_BOOKS, DUMMY_CUSTOMERS } from '../data';
import type { AuthUser } from '../types';

// --- User Initialization on First Login ---
export async function initializeNewUser(userId: string) {
  if (!db) return;
  const userDocRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userDocRef);

  // Check if the user document already has collections initialized
  if (userDoc.exists() && userDoc.data()?.initialized) {
    return; // Already initialized
  }

  const batch = writeBatch(db);

  // Create a "Walk-in Customer"
  const customersCollection = collection(userDocRef, 'customers');
  const walkInCustomerRef = doc(customersCollection);
  batch.set(walkInCustomerRef, {
    name: 'Walk-in Customer',
    phone: 'N/A',
    address: 'N/A',
    openingBalance: 0,
    dueBalance: 0,
  });

  // Create metadata for counters
  const metadataCollection = collection(userDocRef, 'metadata');
  const countersRef = doc(metadataCollection, 'counters');
  batch.set(countersRef, { lastPurchaseNumber: 0, lastSaleNumber: 0, lastReturnNumber: 0 });
  
  // Mark user as initialized (but onboarding not yet complete)
  batch.set(userDocRef, { initialized: true }, { merge: true });


  await batch.commit();
  console.log(`Initialized database for new user: ${userId}`);
}

export async function completeOnboarding(userId: string, data: any) {
  if (!db || !userId) return;

  const userDocRef = doc(db, 'users', userId);
  
  // 1. Update user document with company info and mark onboarding as complete
  const userData = {
    companyName: data.companyName,
    address: data.address,
    phone: data.phone,
    bkashNumber: data.bkashNumber,
    bankInfo: data.bankInfo,
    onboardingComplete: true,
  };
  await updateDoc(userDocRef, userData);

  // 2. Record initial capital
  const donationsCollection = collection(userDocRef, 'donations');
  const now = new Date();

  if (data.initialCash > 0) {
    await addDoc(donationsCollection, {
      donorName: 'Initial Capital',
      amount: data.initialCash,
      date: Timestamp.fromDate(now),
      paymentMethod: 'Cash',
      notes: 'Initial cash balance upon store setup.',
    });
  }

  if (data.initialBank > 0) {
    await addDoc(donationsCollection, {
      donorName: 'Initial Capital',
      amount: data.initialBank,
      date: Timestamp.fromDate(now),
      paymentMethod: 'Bank',
      notes: 'Initial bank balance upon store setup.',
    });
  }
  
  // Revalidate paths to ensure data is fresh across the app
  revalidatePath('/dashboard', 'layout');
}


export async function updateCompanyDetails(userId: string, data: Partial<AuthUser>) {
    if (!db || !userId) return;
    const userDocRef = doc(db, 'users', userId);
    
    // Construct the data object with only the fields we want to update
    const updateData: { [key: string]: any } = {};
    if (data.companyName) updateData.companyName = data.companyName;
    if (data.address) updateData.address = data.address;
    if (data.phone) updateData.phone = data.phone;
    if (data.bkashNumber !== undefined) updateData.bkashNumber = data.bkashNumber;
    if (data.bankInfo !== undefined) updateData.bankInfo = data.bankInfo;

    await updateDoc(userDocRef, updateData);
    revalidatePath('/dashboard', 'layout');
}


// --- Database Seeding/Resetting for a specific user ---
export async function resetDatabase(userId: string) {
  if (!db || !userId) {
    console.warn('Firebase not configured or no user ID provided. Database reset skipped.');
    return;
  }
  console.log(`Starting database reset for user: ${userId}`);

  const userRef = doc(db, 'users', userId);
  const batch = writeBatch(db);

  const collectionsToDelete = ['books', 'customers', 'sales', 'sales_returns', 'expenses', 'transactions', 'purchases', 'donations', 'metadata'];
  for (const coll of collectionsToDelete) {
    const snapshot = await getDocs(collection(userRef, coll));
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
  }
  
  await batch.commit();
  console.log(`All collections cleared for user: ${userId}`);
  
  // Re-initialize with the empty state + walk-in customer
  await initializeNewUser(userId);
  console.log(`Database reset and re-initialized for user: ${userId}`);

  // Revalidate all paths
  const paths = ['/dashboard', '/books', '/customers', '/sales', '/sales-returns', '/expenses', '/donations', '/receivables', '/payables', '/purchases', '/balance-sheet'];
  paths.forEach(path => revalidatePath(path));
}
