import CustomerManagement from '@/components/customer-management';
import { customers } from '@/lib/data';

export default async function CustomersPage() {
  // In a real app, you would fetch customers from your database here.
  const customerData = customers;

  return <CustomerManagement initialCustomers={customerData} />;
}
