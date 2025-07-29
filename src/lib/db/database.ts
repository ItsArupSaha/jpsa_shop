
'use server';

import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import { DUMMY_BOOKS, DUMMY_CUSTOMERS } from '../data';

// --- Database Seeding/Resetting ---
export async function resetDatabase(userId: string) {
  if (!db || !userId) return;
  console.log(`Starting database reset for user ${userId}...`);

  const batch = writeBatch(db);
  const userRef = doc(db, 'users', userId);

  const collectionsToDelete = ['books', 'customers', 'sales', 'expenses', 'transactions', 'purchases', 'donations', 'metadata'];
  for (const coll of collectionsToDelete) {
    const snapshot = await getDocs(collection(userRef, coll));
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
  }
  
  await batch.commit();
  console.log(`All collections for user ${userId} cleared.`);
  
  // Re-run batch for seeding
  const seedBatch = writeBatch(db);
  const userSeedRef = doc(db, 'users', userId);

  // Seed Books
  DUMMY_BOOKS.forEach(book => {
    const bookRef = doc(collection(userSeedRef, 'books'));
    seedBatch.set(bookRef, book);
  });

  // Seed Customers
  DUMMY_CUSTOMERS.forEach(customer => {
    const customerRef = doc(collection(userSeedRef, 'customers'));
    const customerWithDue = { ...customer, dueBalance: customer.openingBalance };
    seedBatch.set(customerRef, customerWithDue);
  });
  
  // Seed a "Walk-in Customer"
  const walkInCustomerRef = doc(collection(userSeedRef, 'customers'));
  seedBatch.set(walkInCustomerRef, {
    name: 'Walk-in Customer',
    phone: 'N/A',
    address: 'N/A',
    openingBalance: 0,
    dueBalance: 0,
  });

  const metadataRef = doc(userSeedRef, 'metadata', 'counters');
  seedBatch.set(metadataRef, { lastPurchaseNumber: 0 });

  await seedBatch.commit();
  console.log(`Database for user ${userId} reset and seeded with initial data.`);

  // Revalidate all paths
  const paths = ['/dashboard', '/books', '/customers', '/sales', '/expenses', '/donations', '/receivables', '/payables', '/purchases', '/balance-sheet'];
  paths.forEach(path => revalidatePath(path));
}

export async function initializeNewUser(userId: string) {
  if (!db || !userId) return;
  console.log(`Initializing empty bookstore for new user ${userId}...`);

  const batch = writeBatch(db);
  const userRef = doc(db, 'users', userId);

  // Seed a "Walk-in Customer" which is essential for sales functionality
  const walkInCustomerRef = doc(collection(userRef, 'customers'));
  batch.set(walkInCustomerRef, {
    name: 'Walk-in Customer',
    phone: 'N/A',
    address: 'N/A',
    openingBalance: 0,
    dueBalance: 0,
  });

  // Initialize metadata counters
  const metadataRef = doc(userRef, 'metadata', 'counters');
  batch.set(metadataRef, { lastPurchaseNumber: 0 });

  await batch.commit();
  console.log(`Empty bookstore initialized for user ${userId}.`);
}
