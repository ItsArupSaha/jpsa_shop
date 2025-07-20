import DonationsManagement from '@/components/donations-management';
import { getDonations } from '@/lib/actions';

export default async function DonationsPage() {
  const initialDonations = await getDonations();
  return <DonationsManagement initialDonations={initialDonations} />;
}
