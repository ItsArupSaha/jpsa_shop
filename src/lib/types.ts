export type Customer = {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  address: string;
  openingBalance: number;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  productionPrice: number;
  sellingPrice: number;
  stock: number;
};

export type SaleItem = {
    bookId: string;
    quantity: number;
    price: number; // This is the selling price at the time of sale
};

export type Sale = {
  id: string;
  date: string; // Changed to string for serialization
  customerId: string;
  items: SaleItem[];
  subtotal: number;
  discountType: 'none' | 'percentage' | 'amount';
  discountValue: number;
  total: number;
  paymentMethod: 'Cash' | 'Bank' | 'Due' | 'Split';
  amountPaid?: number;
};

export type Expense = {
  id: string;
  date: string; // Changed to string for serialization
  description: string;
  amount: number;
};

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  dueDate: string; // Changed to string for serialization
  status: 'Pending' | 'Paid';
  type: 'Receivable' | 'Payable';
  paymentMethod?: 'Cash' | 'Bank';
  customerId?: string;
};
