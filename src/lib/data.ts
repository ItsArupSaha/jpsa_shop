import type { Book, Sale, Expense, Transaction, Customer } from './types';

export const customers: Customer[] = [
  { id: 'cust1', name: 'Alice Johnson', phone: '123-456-7890', address: '123 Maple St, Springfield', openingBalance: 0 },
  { id: 'cust2', name: 'Bob Williams', phone: '234-567-8901', address: '456 Oak Ave, Springfield', openingBalance: 50 },
  { id: 'cust3', name: 'Corporate Client', phone: '345-678-9012', address: '789 Pine Ln, Springfield', openingBalance: 0 },
  { id: 'cust4', name: 'Walk-in Customer', phone: 'N/A', address: 'N/A', openingBalance: 0 },
];

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
    customerId: 'cust1',
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
    customerId: 'cust3',
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
    customerId: 'cust2',
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
    customerId: 'cust4',
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
