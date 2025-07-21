import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DonationsClient } from './donations-client';

export default function DonationsManagement() {

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-2xl">Donations</CardTitle>
            <CardDescription>Record and view all donations received.</CardDescription>
          </div>
          <DonationsClient />
        </div>
      </CardHeader>
      <CardContent>
        {/* The table and other client-side logic are now in DonationsClient */}
      </CardContent>
    </Card>
  );
}
