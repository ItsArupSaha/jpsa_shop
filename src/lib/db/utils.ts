
import type { Customer, Donation, Expense, Item, Purchase, Sale, SalesReturn, Transaction, Transfer } from '../types';

// Helper function to get current year (January 1st, 12:00 AM)
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

// Helper function to check if we need to reset counters for new year
export function shouldResetCounters(metadataYear: number | undefined, currentYear: number): boolean {
  if (!metadataYear) return false; // First time, don't reset
  return metadataYear < currentYear;
}

// Helper to convert Firestore docs to our types
export function docToItem(d: any): Item {
  return { id: d.id, ...d.data() } as Item;
}
export function docToCustomer(d: any): Customer {
  return { id: d.id, ...d.data() } as Customer;
}
export function docToSale(d: any): Sale {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date?.toDate ? data.date.toDate().toISOString() : new Date(data.date || Date.now()).toISOString(),
    } as Sale;
}
export function docToSalesReturn(d: any): SalesReturn {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date?.toDate ? data.date.toDate().toISOString() : new Date(data.date || Date.now()).toISOString(),
    } as SalesReturn;
}
export function docToPurchase(d: any): Purchase {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date?.toDate ? data.date.toDate().toISOString() : new Date(data.date || Date.now()).toISOString(),
        dueDate: data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : new Date(data.dueDate || Date.now()).toISOString(),
    } as Purchase;
}
export function docToExpense(d: any): Expense {
    const data = d.data();
    return { 
        id: d.id, 
        expenseId: data.expenseId || `EXP-${String(d.id).slice(0, 8)}`, // Fallback for existing expenses
        ...data,
        date: data.date?.toDate ? data.date.toDate().toISOString() : new Date(data.date || Date.now()).toISOString(),
    } as Expense;
}
export function docToDonation(d: any): Donation {
    const data = d.data();
    return { 
        id: d.id, 
        donationId: data.donationId || `DON-${String(d.id).slice(0, 8)}`, // Fallback for existing donations
        ...data,
        date: data.date?.toDate ? data.date.toDate().toISOString() : new Date(data.date || Date.now()).toISOString(),
    } as Donation;
}
export function docToTransaction(d: any): Transaction {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        dueDate: data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : new Date(data.dueDate || Date.now()).toISOString(),
    } as Transaction;
}
export function docToTransfer(d: any): Transfer {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date?.toDate ? data.date.toDate().toISOString() : new Date(data.date || Date.now()).toISOString(),
    } as Transfer;
}
