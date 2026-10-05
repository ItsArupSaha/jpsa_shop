'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateFieldProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  /** Disable picking future days (default: true). */
  disableFuture?: boolean;
  /** Disable picking past days. */
  disablePast?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

/**
 * The single date picker used across the app: a button showing the chosen day
 * that opens the calendar popover. Every form and filter uses this so dates
 * look and behave identically everywhere.
 */
export function DateField({
  value,
  onChange,
  placeholder = 'Pick a date',
  disableFuture = true,
  disablePast = false,
  className,
  id,
  ...rest
}: DateFieldProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn('w-full pl-3 text-left font-normal', !value && 'text-muted-foreground', className)}
          {...rest}
        >
          {value ? format(value, 'dd MMM yyyy') : <span>{placeholder}</span>}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          disabled={(date) =>
            (disableFuture && date > new Date()) ||
            (disablePast && date < new Date(new Date().setHours(0, 0, 0, 0)))
          }
        />
      </PopoverContent>
    </Popover>
  );
}
