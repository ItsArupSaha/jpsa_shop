export type Book = {
  id: string;
  title: string;
  author: string;
  productionPrice: number;
  sellingPrice: number;
  stock: number;
};

export type Sale = {
  id: string;
  date: Date;
  items: {
    bookId: string;
    quantity: number;
    price: number; // This is the selling price at the time of sale
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
