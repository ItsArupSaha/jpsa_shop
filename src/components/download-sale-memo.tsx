
'use client';

import type { AuthUser, Customer, Item, Sale } from '@/lib/types';
import { Download } from 'lucide-react';
import { Button } from './ui/button';
import { generateSaleMemoPdf } from './sale-memo-pdf';

interface DownloadSaleMemoProps {
  sale: Sale;
  customer: Customer;
  items: Item[];
  user: AuthUser;
}

export function DownloadSaleMemo({ sale, customer, items, user }: DownloadSaleMemoProps) {
  return (
    <Button
      onClick={() => generateSaleMemoPdf({ sale, customer, items, user })}
      variant="ghost"
      size="icon"
      title="Download Memo"
      aria-label={`Download memo for ${sale.saleId}`}
    >
      <Download className="h-4 w-4" />
    </Button>
  );
}
