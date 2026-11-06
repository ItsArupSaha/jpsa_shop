'use client';
import PackageManagement from '../../../components/package-management';
import { useAuth } from '@/hooks/use-auth';
import { Package } from 'lucide-react';

export default function PackagesPage() {
    const { user } = useAuth();
    if (!user) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
              <Package className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
    }
  return <PackageManagement userId={user.uid} />;
}
