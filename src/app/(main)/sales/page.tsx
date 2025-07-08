import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SalesPage() {
  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Record a New Sale</CardTitle>
        <CardDescription>Sales input form, sell memo generation, and sales history will be here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm mt-2">Feature coming soon.</p>
      </CardContent>
    </Card>
  );
}
