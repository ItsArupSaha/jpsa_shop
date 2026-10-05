import { CalendarClock } from 'lucide-react';

import { DateField } from '@/components/date-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ClosingStockDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  closingStockDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  onCalculate: () => void;
  isCalculating: boolean;
}

export function ClosingStockDialog({
  isOpen,
  onOpenChange,
  closingStockDate,
  onDateChange,
  onCalculate,
  isCalculating,
}: ClosingStockDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarClock className="mr-2 h-4 w-4" /> Stock on a Date
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stock on a Date</DialogTitle>
          <DialogDescription>
            Pick a day to see how much of each item was in stock at the end of that day.
            Today&rsquo;s choice always matches your current inventory.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <DateField
            value={closingStockDate}
            onChange={onDateChange}
            placeholder="Pick a date"
            aria-label="Closing stock date"
          />
          <p className="text-sm text-muted-foreground mt-3">
            The report undoes every sale, purchase, and return made after the chosen day,
            so past dates show the stock you really had then.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={onCalculate} disabled={isCalculating || !closingStockDate}>
            {isCalculating ? 'Calculating...' : 'Calculate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
