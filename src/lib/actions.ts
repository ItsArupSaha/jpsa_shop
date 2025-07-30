
// This file is an aggregator for all database actions.
// It imports from the /lib/db directory and re-exports everything.
// This allows components to import from a single file, while keeping the actions organized.

export * from './db/books';
export * from './db/customers';
export * from './db/sales';
export * from './db/purchases';
export * from './db/expenses';
export * from './db/donations';
export * from './db/transactions';
export * from './db/dashboard';
export * from './db/database';
export * from './db/balance-sheet';
export * from './db/reports';

