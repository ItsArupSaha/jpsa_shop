

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isApproved: boolean;
  createdAt: any; // Firestore Timestamp
  
  // Onboarding fields
  companyName?: string;
  subtitle?: string;
  address?: string;
  phone?: string;
  bkashNumber?: string;
  bankInfo?: string;
  onboardingComplete?: boolean;
  secretKey?: string;
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

export type Category = {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
};

export type Item = {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  author?: string; // Optional, only for books
  productionPrice: number;
  sellingPrice: number;
  stock: number;
};

export type ClosingStock = Item & {
  closingStock: number;
};

export type SaleItem = {
    itemId: string;
    quantity: number;
    price: number; // This is the selling price at the time of sale
};

export type Sale = {
  id: string;
  saleId: string; // The auto-generated ID like SALE-0001
  date: string; // Changed to string for serialization
  customerId: string;
  items: SaleItem[];
  subtotal: number;
  discountType: 'none' | 'percentage' | 'amount';
  discountValue: number;
  total: number;
  paymentMethod: 'Cash' | 'Bank' | 'Due' | 'Split' | 'Paid by Credit';
  amountPaid?: number;
  splitPaymentMethod?: 'Cash' | 'Bank';
  creditApplied?: number;
};

export type SalesReturnItem = {
  itemId: string;
  quantity: number;
  price: number; // The price at which the item was sold, used for credit.
};

export type SalesReturn = {
  id: string;
  returnId: string;
  date: string;
  customerId: string;
  items: SalesReturnItem[];
  totalReturnValue: number;
};


export type PurchaseItem = {
    itemName: string;
    categoryId: string;
    categoryName: string;
    author?: string;
    quantity: number;
    cost: number;
    sellingPrice?: number;
};

export type Purchase = {
    id: string;
    purchaseId: string; // The auto-generated ID like PUR-0001
    date: string;
    supplier: string;
    items: PurchaseItem[];
    totalAmount: number;
    paymentMethod: 'Cash' | 'Bank' | 'Due' | 'Split' | 'N/A';
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

export type Capital = {
  id: string;
  date: string;
  source: 'Initial Capital' | 'Capital Adjustment';
  amount: number;
  paymentMethod: 'Cash' | 'Bank' | 'Asset';
  notes?: string;
};

export type InitialCapital = {
  cash: number;
  bank: number;
}

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  dueDate: string; // Changed to string for serialization
  status: 'Pending' | 'Paid';
  type: 'Receivable' | 'Payable';
  paymentMethod?: 'Cash' | 'Bank';
  customerId?: string;
  customerName?: string;
};

// Metadata for counters, etc.
export type Metadata = {
  lastPurchaseNumber: number;
  lastSaleNumber: number;
  lastReturnNumber: number;
}

    