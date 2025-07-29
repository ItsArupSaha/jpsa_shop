
import { getDonationsPaginated } from '@/lib/actions';
import DonationsManagement from '@/components/donations-management';

export default async function DonationsPage() {
  const { donations, hasMore } = await getDonationsPaginated({ pageLimit: 10 });
  return <DonationsManagement initialDonations={donations} initialHasMore={hasMore} />;
}
