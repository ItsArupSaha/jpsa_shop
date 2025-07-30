
'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { resetDatabase } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DatabaseZap } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export function ResetDatabaseButton() {
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleReset = () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to reset the database.' });
        return;
    }
    startTransition(async () => {
      await resetDatabase(user.uid);
      toast({
        title: 'Database Reset & Seeded',
        description: 'All data for your account has been cleared and re-initialized.',
      });
      // Force a hard reload to ensure all states are fresh
      window.location.reload();
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={!user}>
          <DatabaseZap className="mr-2 h-4 w-4" /> Reset Database
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete all current data in your account and replace it with a fresh, empty bookstore setup.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleReset} disabled={isPending || !user} className="bg-destructive hover:bg-destructive/90">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Resetting...' : 'Yes, reset everything'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
