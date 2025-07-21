import TransactionsManagement from '@/components/transactions-management';

export default function PayablesPage() {
  return (
    <TransactionsManagement
      title="Track Payables"
      description="Manage amounts the bookstore owes."
      type="Payable"
    />
  );
}
