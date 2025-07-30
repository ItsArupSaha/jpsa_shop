
'use server';

import { collection, doc, getDocs, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
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
  batch.set(countersRef, { lastPurchaseNumber: 0, lastSaleNumber: 0 });
  
  // Mark user as initialized (and approved)
  batch.set(userDocRef, { initialized: true, isApproved: true }, { merge: true });


  await batch.commit();
  console.log(`Initialized database for new user: ${userId}`);
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

  const collectionsToDelete = ['books', 'customers', 'sales', 'expenses', 'transactions', 'purchases', 'donations', 'metadata'];
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
  const paths = ['/dashboard', '/books', '/customers', '/sales', '/expenses', '/donations', '/receivables', '/payables', '/purchases', '/balance-sheet'];
  paths.forEach(path => revalidatePath(path));
}

export async function getAuthUser() {
    // This is a placeholder for a more robust auth check, potentially using next-auth or similar
    // For now, it returns a mock user. In a real app, you'd get this from the session.
    return {
        uid: 'mock-user-id-123',
        name: 'Store Owner',
        email: 'owner@example.com'
    } as AuthUser;
}
