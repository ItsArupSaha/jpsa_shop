
'use client';
import ReportGenerator from '@/components/report-generator';
import { useAuth } from '@/hooks/use-auth';
import { Book } from 'lucide-react';

export default function ReportsPage() {
    const { user } = useAuth();
    if (!user) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
              <Book className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
    }
  return <ReportGenerator userId={user.uid} />;
}
