import type { Customer, Donation, Expense, Item, Purchase, Sale, SalesReturn, Transaction, Transfer } from '../types';

/**
 * Recursively converts Firestore Timestamps, Dates, and non-plain objects into plain serializable values.
 * This guarantees safe serialization across Next.js Server Action / Server Component boundaries.
 */
export function toPlainValue<T = any>(val: any): T {
  if (val === null || val === undefined) return val;
  if (typeof val?.toDate === 'function') {
    return val.toDate().toISOString() as any;
  }
  if (typeof val?.toMillis === 'function') {
    return new Date(val.toMillis()).toISOString() as any;
  }
  if (val instanceof Date) {
    return val.toISOString() as any;
  }
  if (typeof val === 'object' && typeof val.seconds === 'number' && typeof val.nanoseconds === 'number') {
    return new Date(val.seconds * 1000).toISOString() as any;
  }
  if (Array.isArray(val)) {
    return val.map(toPlainValue) as any;
  }
  if (typeof val === 'object' && val.constructor === Object) {
    const plain: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      plain[k] = toPlainValue(v);
    }
    return plain as any;
  }
  return val;
}

// Helper to convert Firestore docs to our types
export function docToItem(d: any): Item {
  const plain = toPlainValue(d.data());
  return { ...plain, id: d.id } as Item;
}

export function docToCustomer(d: any): Customer {
  const plain = toPlainValue(d.data());
  return { ...plain, id: d.id } as Customer;
}

export function docToSale(d: any): Sale {
  const data = d.data();
  const plain = toPlainValue(data);
  return { 
    ...plain,
    id: d.id, 
    date: data.date ? (typeof data.date.toDate === 'function' ? data.date.toDate().toISOString() : String(plain.date)) : new Date().toISOString(),
  } as Sale;
}

export function docToSalesReturn(d: any): SalesReturn {
  const data = d.data();
  const plain = toPlainValue(data);
  return { 
    ...plain,
    id: d.id, 
    date: data.date ? (typeof data.date.toDate === 'function' ? data.date.toDate().toISOString() : String(plain.date)) : new Date().toISOString(),
  } as SalesReturn;
}

export function docToPurchase(d: any): Purchase {
  const data = d.data();
  const plain = toPlainValue(data);
  return { 
    ...plain,
    id: d.id, 
    date: data.date ? (typeof data.date.toDate === 'function' ? data.date.toDate().toISOString() : String(plain.date)) : new Date().toISOString(),
    dueDate: data.dueDate ? (typeof data.dueDate.toDate === 'function' ? data.dueDate.toDate().toISOString() : String(plain.dueDate)) : new Date().toISOString(),
  } as Purchase;
}

export function docToExpense(d: any): Expense {
  const data = d.data();
  const plain = toPlainValue(data);
  return { 
    ...plain,
    id: d.id, 
    expenseId: data.expenseId || `EXP-${String(d.id).slice(0, 8)}`,
    date: data.date ? (typeof data.date.toDate === 'function' ? data.date.toDate().toISOString() : String(plain.date)) : new Date().toISOString(),
  } as Expense;
}

export function docToDonation(d: any): Donation {
  const data = d.data();
  const plain = toPlainValue(data);
  return { 
    ...plain,
    id: d.id, 
    donationId: data.donationId || `DON-${String(d.id).slice(0, 8)}`,
    date: data.date ? (typeof data.date.toDate === 'function' ? data.date.toDate().toISOString() : String(plain.date)) : new Date().toISOString(),
  } as Donation;
}

export function docToTransaction(d: any): Transaction {
  const data = d.data();
  const plain = toPlainValue(data);
  return { 
    ...plain,
    id: d.id, 
    dueDate: data.dueDate ? (typeof data.dueDate.toDate === 'function' ? data.dueDate.toDate().toISOString() : String(plain.dueDate)) : new Date().toISOString(),
  } as Transaction;
}

export function docToTransfer(d: any): Transfer {
  const data = d.data();
  const plain = toPlainValue(data);
  return { 
    ...plain,
    id: d.id, 
    date: data.date ? (typeof data.date.toDate === 'function' ? data.date.toDate().toISOString() : String(plain.date)) : new Date().toISOString(),
  } as Transfer;
}
