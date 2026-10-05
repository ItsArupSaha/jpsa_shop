'use client';

import * as React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface SearchSelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface SearchSelectProps {
  options: SearchSelectOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * A select you can type into: opens a popover with an instant filter box.
 * Used anywhere a long list (customers, items) would otherwise need scrolling.
 */
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Type to search...',
  emptyMessage = 'Nothing found.',
  className,
  ...rest
}: SearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const searchRef = React.useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.hint || '').toLowerCase().includes(q)
    );
  }, [options, query]);

  return (
    <Popover open={open} onOpenChange={(next) => {
      setOpen(next);
      if (next) setQuery('');
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground', className)}
          {...rest}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,var(--radix-popover-trigger-width))] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent',
                  option.value === value && 'bg-accent font-medium'
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{option.label}</span>
                  {option.hint && <span className="truncate text-xs text-muted-foreground">{option.hint}</span>}
                </span>
                {option.value === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
