

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isApproved: boolean;
  createdAt: any; // Firestore Timestamp
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  address: string;
  openingBalance: number;
  dueBalance: number;
};

export type CustomerWithDue = Customer & {
  dueBalance: number;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  productionPrice: number;
  sellingPrice: number;
  stock: number;
};

export type ClosingStock = Book & {
  closingStock: number;
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

export type PurchaseItem = {
    itemName: string;
    category: 'Book' | 'Office Asset';
    author?: string; // Optional, only for books
    quantity: number;
    cost: number;
};

export type Purchase = {
    id: string;
    purchaseId: string; // The auto-generated ID like PUR-0001
    date: string;
    supplier: string;
    items: PurchaseItem[];
    totalAmount: number;
    paymentMethod: 'Cash' | 'Bank' | 'Due' | 'Split';
    amountPaid?: number;
    splitPaymentMethod?: 'Cash' | 'Bank';
    dueDate: string;
};

export type Expense = {
  id: string;
  date: string; // Changed to string for serialization
  description: string;
  amount: number;
  paymentMethod?: 'Cash' | 'Bank';
};

export type Donation = {
  id: string;
  date: string;
  donorName: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank';
  notes?: string;
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

// Metadata for counters, etc.
export type Metadata = {
  lastPurchaseNumber: number;
}
