import type { Book, Sale, Expense, Transaction, Customer } from './types';

export const customers: Omit<Customer, 'id'>[] = [
  { name: 'Alice Johnson', phone: '123-456-7890', address: '123 Maple St, Springfield', openingBalance: 0 },
  { name: 'Bob Williams', phone: '234-567-8901', address: '456 Oak Ave, Springfield', openingBalance: 50 },
  { name: 'Corporate Client', phone: '345-678-9012', address: '789 Pine Ln, Springfield', openingBalance: 0 },
  { name: 'Walk-in Customer', phone: 'N/A', address: 'N/A', openingBalance: 0 },
];

export const books: Omit<Book, 'id'>[] = [
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', productionPrice: 5.50, sellingPrice: 10.99, stock: 15 },
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', productionPrice: 7.00, sellingPrice: 12.50, stock: 8 },
  { title: '1984', author: 'George Orwell', productionPrice: 4.99, sellingPrice: 9.99, stock: 22 },
  { title: 'Pride and Prejudice', author: 'Jane Austen', productionPrice: 3.50, sellingPrice: 8.00, stock: 30 },
  { title: 'The Catcher in the Rye', author: 'J.D. Salinger', productionPrice: 6.00, sellingPrice: 11.25, stock: 12 },
];

export const sales: Omit<Sale, 'id' | 'customerId'>[] = [
  { 
    date: new Date('2024-05-15').toISOString(), 
    items: [
      { bookId: 'book-0', quantity: 2, price: 10.99 },
      { bookId: 'book-2', quantity: 1, price: 9.99 }
    ],
    subtotal: 31.97,
    discountType: 'amount',
    discountValue: 1.97,
    total: 30.00,
    paymentMethod: 'Cash',
  },
  { 
    date: new Date('2024-05-20').toISOString(), 
    items: [
      { bookId: 'book-1', quantity: 1, price: 12.50 }
    ],
    subtotal: 12.50,
    discountType: 'none',
    discountValue: 0,
    total: 12.50,
    paymentMethod: 'Due',
  },
  { 
    date: new Date().toISOString(), 
    items: [
      { bookId: 'book-3', quantity: 5, price: 8.00 }
    ],
    subtotal: 40.00,
    discountType: 'percentage',
    discountValue: 10, // 10%
    total: 36.00,
    paymentMethod: 'Bank'
  },
  { 
    date: new Date().toISOString(), 
    items: [
      { bookId: 'book-4', quantity: 2, price: 11.25 }
    ],
    subtotal: 22.50,
    discountType: 'none',
    discountValue: 0,
    total: 22.50,
    paymentMethod: 'Cash'
  }
];

export const expenses: Omit<Expense, 'id'>[] = [
  { date: new Date('2024-05-01').toISOString(), description: 'Rent', amount: 1500 },
  { date: new Date('2024-05-10').toISOString(), description: 'Utilities', amount: 250 },
  { date: new Date('2024-05-25').toISOString(), description: 'New Book Shipment', amount: 800 },
  { date: new Date().toISOString(), description: 'Marketing', amount: 300 },
];

export const receivables: Omit<Transaction, 'id'>[] = [
  { description: 'School Bulk Order', amount: 350.00, dueDate: new Date('2024-06-15').toISOString(), status: 'Pending', type: 'Receivable' },
  { description: 'Customer Special Order', amount: 45.50, dueDate: new Date('2024-05-30').toISOString(), status: 'Paid', type: 'Receivable' },
];

export const payables: Omit<Transaction, 'id'>[] = [
  { description: 'Publisher Invoice #123', amount: 600.00, dueDate: new Date('2024-06-10').toISOString(), status: 'Pending', type: 'Payable' },
  { description: 'Cleaning Services', amount: 120.00, dueDate: new Date('2024-05-28').toISOString(), status: 'Paid', type: 'Payable' },
];
