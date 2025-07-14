import TransactionsManagement from '@/components/transactions-management';

export default function ReceivablesPage() {
  return (
    <TransactionsManagement
      title="Track Receivables"
      description="Manage amounts owed to the bookstore."
      type="Receivable"
    />
  );
}
