import type { Book, Sale, Expense, Transaction } from './types';

export const books: Book[] = [
  { id: '1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', productionPrice: 5.50, sellingPrice: 10.99, stock: 15 },
  { id: '2', title: 'To Kill a Mockingbird', author: 'Harper Lee', productionPrice: 7.00, sellingPrice: 12.50, stock: 8 },
  { id: '3', title: '1984', author: 'George Orwell', productionPrice: 4.99, sellingPrice: 9.99, stock: 22 },
  { id: '4', title: 'Pride and Prejudice', author: 'Jane Austen', productionPrice: 3.50, sellingPrice: 8.00, stock: 30 },
  { id: '5', title: 'The Catcher in the Rye', author: 'J.D. Salinger', productionPrice: 6.00, sellingPrice: 11.25, stock: 12 },
];

export const sales: Sale[] = [
  { 
    id: 's1', 
    date: new Date('2024-05-15'), 
    customerName: 'Alice Johnson',
    items: [
      { bookId: '1', quantity: 2, price: 10.99 },
      { bookId: '3', quantity: 1, price: 9.99 }
    ],
    subtotal: 31.97,
    discountType: 'amount',
    discountValue: 1.97,
    total: 30.00,
    paymentMethod: 'Cash',
  },
  { 
    id: 's2', 
    date: new Date('2024-05-20'), 
    customerName: 'Corporate Client',
    items: [
      { bookId: '2', quantity: 1, price: 12.50 }
    ],
    subtotal: 12.50,
    discountType: 'none',
    discountValue: 0,
    total: 12.50,
    paymentMethod: 'Due',
  },
  { 
    id: 's3', 
    date: new Date(), 
    customerName: 'Bob Williams',
    items: [
      { bookId: '4', quantity: 5, price: 8.00 }
    ],
    subtotal: 40.00,
    discountType: 'percentage',
    discountValue: 10, // 10%
    total: 36.00,
    paymentMethod: 'Bank'
  },
  { 
    id: 's4', 
    date: new Date(), 
    customerName: 'Walk-in Customer',
    items: [
      { bookId: '5', quantity: 2, price: 11.25 }
    ],
    subtotal: 22.50,
    discountType: 'none',
    discountValue: 0,
    total: 22.50,
    paymentMethod: 'Cash'
  }
];

export const expenses: Expense[] = [
  { id: 'e1', date: new Date('2024-05-01'), description: 'Rent', amount: 1500 },
  { id: 'e2', date: new Date('2024-05-10'), description: 'Utilities', amount: 250 },
  { id: 'e3', date: new Date('2024-05-25'), description: 'New Book Shipment', amount: 800 },
  { id: 'e4', date: new Date(), description: 'Marketing', amount: 300 },
];

export const receivables: Transaction[] = [
  { id: 'r1', description: 'School Bulk Order', amount: 350.00, dueDate: new Date('2024-06-15'), status: 'Pending' },
  { id: 'r2', description: 'Customer Special Order', amount: 45.50, dueDate: new Date('2024-05-30'), status: 'Paid' },
  { id: 'r3', description: 'Sale #s2 - Corporate Client', amount: 12.50, dueDate: new Date('2024-06-20'), status: 'Pending' },
];

export const payables: Transaction[] = [
  { id: 'p1', description: 'Publisher Invoice #123', amount: 600.00, dueDate: new Date('2024-06-10'), status: 'Pending' },
  { id: 'p2', description: 'Cleaning Services', amount: 120.00, dueDate: new Date('2024-05-28'), status: 'Paid' },
];
