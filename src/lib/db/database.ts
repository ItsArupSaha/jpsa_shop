
'use server';

import { collection, doc, writeBatch, getDocs, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { db } from '../firebase';
import { DUMMY_BOOKS, DUMMY_CUSTOMERS } from '../data';

// --- Database Seeding/Resetting ---
export async function resetDatabase(userId: string) {
  if (!db || !userId) return;
  console.log(`Starting database reset for user ${userId}...`);

  const userRef = doc(db, 'users', userId);
  const deleteBatch = writeBatch(db);

  // Correctly delete all documents from user's sub-collections
  const collectionsToDelete = ['books', 'customers', 'sales', 'expenses', 'transactions', 'purchases', 'donations', 'metadata'];
  for (const coll of collectionsToDelete) {
    try {
      const subCollectionRef = collection(userRef, coll);
      const snapshot = await getDocs(subCollectionRef);
      snapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
    } catch (error) {
      // It's okay if a collection doesn't exist.
      console.log(`Collection ${coll} not found for user ${userId}, skipping delete.`);
    }
  }
  
  await deleteBatch.commit();
  console.log(`All sub-collections for user ${userId} cleared.`);
  
  // Create a new batch for seeding data into the user's sub-collections
  const seedBatch = writeBatch(db);

  // Seed Books into the user's 'books' sub-collection
  DUMMY_BOOKS.forEach(book => {
    const bookRef = doc(collection(userRef, 'books'));
    seedBatch.set(bookRef, book);
  });

  // Seed Customers into the user's 'customers' sub-collection
  DUMMY_CUSTOMERS.forEach(customer => {
    const customerRef = doc(collection(userRef, 'customers'));
    const customerWithDue = { ...customer, dueBalance: customer.openingBalance };
    seedBatch.set(customerRef, customerWithDue);
  });
  
  // Seed a "Walk-in Customer" into the user's 'customers' sub-collection
  const walkInCustomerRef = doc(collection(userRef, 'customers'));
  seedBatch.set(walkInCustomerRef, {
    name: 'Walk-in Customer',
    phone: 'N/A',
    address: 'N/A',
    openingBalance: 0,
    dueBalance: 0,
  });

  // Seed metadata into the user's 'metadata' sub-collection
  const metadataRef = doc(userRef, 'metadata', 'counters');
  seedBatch.set(metadataRef, { lastPurchaseNumber: 0 });

  await seedBatch.commit();

  // Mark the user as approved now that seeding is complete
  await updateDoc(userRef, { isApproved: true });
  console.log(`Database for user ${userId} reset and seeded with initial data.`);

  // Revalidate all paths to reflect the new data
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

  // Finally, approve the user
  batch.update(userRef, { isApproved: true });

  await batch.commit();
  console.log(`Empty bookstore initialized for user ${userId}.`);
}
