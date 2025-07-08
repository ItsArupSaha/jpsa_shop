export type Book = {
  id: string;
  title: string;
  author: string;
  price: number;
  stock: number;
};

export type Sale = {
  id: string;
  date: Date;
  items: {
    bookId: string;
    quantity: number;
    price: number;
  }[];
  total: number;
};

export type Expense = {
  id: string;
  date: Date;
  description: string;
  amount: number;
};

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: 'Pending' | 'Paid';
};
