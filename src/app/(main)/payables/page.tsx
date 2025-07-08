import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PayablesPage() {
  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Track Payables</CardTitle>
        <CardDescription>Form to add amounts the bookstore owes and a table to track them.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm mt-2">Feature coming soon.</p>
      </CardContent>
    </Card>
  );
}
