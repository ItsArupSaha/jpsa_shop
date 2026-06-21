'use client';

import ExpiryAlerts from '@/components/expiry-alerts';
import { useAuth } from '@/hooks/use-auth';
import { Package } from 'lucide-react';

export default function ExpiryAlertsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Package className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <ExpiryAlerts userId={user.uid} />;
}
