
'use server';

import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { DUMMY_BOOKS, DUMMY_CUSTOMERS } from '../data';
import { db } from '../firebase';

// --- Database Seeding/Resetting ---
export async function resetDatabase() {
  if (!db) {
    console.warn('Firebase not configured. Database reset skipped.');
    return;
  }
  console.log('Starting database reset...');

  const batch = writeBatch(db);

  const collectionsToDelete = ['books', 'customers', 'sales', 'expenses', 'transactions', 'purchases', 'donations', 'metadata'];
  for (const coll of collectionsToDelete) {
    const snapshot = await getDocs(collection(db, coll));
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
  }
  
  await batch.commit();
  console.log('All collections cleared.');
  
  // Re-run batch for seeding
  const seedBatch = writeBatch(db);

  // Seed Books
  DUMMY_BOOKS.forEach(book => {
    const bookRef = doc(collection(db!, 'books'));
    seedBatch.set(bookRef, book);
  });

  // Seed Customers
  DUMMY_CUSTOMERS.forEach(customer => {
    const customerRef = doc(collection(db!, 'customers'));
    const customerWithDue = { ...customer, dueBalance: customer.openingBalance };
    seedBatch.set(customerRef, customerWithDue);
  });
  
  // Seed a "Walk-in Customer"
  seedBatch.set(doc(collection(db!, 'customers')), {
    name: 'Walk-in Customer',
    phone: 'N/A',
    address: 'N/A',
    openingBalance: 0,
    dueBalance: 0,
  });


  const metadataRef = doc(db!, 'metadata', 'counters');
  seedBatch.set(metadataRef, { lastPurchaseNumber: 0 });

  await seedBatch.commit();
  console.log('Database reset and seeded with initial data.');

  // Revalidate all paths
  const paths = ['/dashboard', '/books', '/customers', '/sales', '/expenses', '/donations', '/receivables', '/payables', '/purchases', '/balance-sheet'];
  paths.forEach(path => revalidatePath(path));
}
