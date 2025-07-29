
import { getDonationsPaginated } from '@/lib/actions';
import DonationsManagement from '@/components/donations-management';
import { auth } from '@/lib/firebase';
import { redirect } from 'next/navigation';

export default async function DonationsPage() {
  const user = auth?.currentUser;
  if (!user) {
    redirect('/login');
  }
  const { donations, hasMore } = await getDonationsPaginated({ userId: user.uid, pageLimit: 10 });
  return <DonationsManagement initialDonations={donations} initialHasMore={hasMore} userId={user.uid} />;
}
