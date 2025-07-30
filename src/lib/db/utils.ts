
import type { Book, Customer, Donation, Expense, Purchase, Sale, Transaction } from '../types';

// Helper to convert Firestore docs to our types
export function docToBook(d: any): Book {
  return { id: d.id, ...d.data() } as Book;
}
export function docToCustomer(d: any): Customer {
  return { id: d.id, ...d.data() } as Customer;
}
export function docToSale(d: any): Sale {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date.toDate().toISOString(),
    } as Sale;
}
export function docToPurchase(d: any): Purchase {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date.toDate().toISOString(),
        dueDate: data.dueDate.toDate().toISOString(),
    } as Purchase;
}
export function docToExpense(d: any): Expense {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date.toDate().toISOString(),
    } as Expense;
}
export function docToDonation(d: any): Donation {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        date: data.date.toDate().toISOString(),
    } as Donation;
}
export function docToTransaction(d: any): Transaction {
    const data = d.data();
    return { 
        id: d.id, 
        ...data,
        dueDate: data.dueDate.toDate().toISOString(),
    } as Transaction;
}
