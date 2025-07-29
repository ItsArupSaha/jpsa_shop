
import ReportGenerator from '@/components/report-generator';
import { auth } from '@/lib/firebase';
import { redirect } from 'next/navigation';

export default function ReportsPage() {
  const user = auth?.currentUser;
  if (!user) {
    redirect('/login');
  }
  return <ReportGenerator userId={user.uid} />;
}
