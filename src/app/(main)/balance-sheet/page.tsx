
import { auth } from '@/lib/firebase';
import { redirect } from 'next/navigation';
import BalanceSheet from '@/components/balance-sheet';

export default function BalanceSheetPage() {
  const user = auth?.currentUser;
  if (!user) {
    redirect('/login');
  }
  return <BalanceSheet userId={user.uid} />;
}
