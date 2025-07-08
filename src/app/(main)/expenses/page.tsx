import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ExpensesPage() {
  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Track Expenses</CardTitle>
        <CardDescription>Expense input form and expense history will be here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm mt-2">Feature coming soon.</p>
      </CardContent>
    </Card>
  );
}
