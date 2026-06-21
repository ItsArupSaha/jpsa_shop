import * as React from 'react';
import { format } from 'date-fns';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
          <Download className="mr-2 h-4 w-4" /> Download Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calculate Closing Stock</DialogTitle>
          <DialogDescription>
            Select a date to calculate the closing stock for all items up to that day.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Calendar
              mode="single"
              selected={closingStockDate}
              onSelect={onDateChange}
              initialFocus
              numberOfMonths={1}
              disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
            />
            <p className="text-sm text-muted-foreground">
              {closingStockDate ? (
                <>Selected: {format(closingStockDate, 'LLL dd, y')}</>
              ) : (
                <span>Please pick a date.</span>
              )}
            </p>
          </div>
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
