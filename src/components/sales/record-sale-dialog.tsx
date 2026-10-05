'use client';

import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Minus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';

import { DateField } from '@/components/date-field';
import { SearchSelect } from '@/components/search-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addSale } from '@/lib/actions';
import { formatTaka } from '@/lib/format';
import type { Customer, Item, Sale } from '@/lib/types';
import { cn } from '@/lib/utils';

import { saleFormSchema, type SaleFormValues } from './schema';
import { SaleMemo } from '../sale-memo';

interface RecordSaleDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  customers: Customer[];
  onSuccess: () => void;
  authUser: any;
}

/**
 * POS-style sale screen: type to find a book, press Enter (or click) to add it,
 * adjust quantities with steppers, and confirm — everything on one screen so a
 * multi-item sale takes seconds instead of a dropdown per item.
 */
export function RecordSaleDialog({
  userId,
  isOpen,
  onOpenChange,
  items,
  customers,
  onSuccess,
  authUser,
}: RecordSaleDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [completedSale, setCompletedSale] = React.useState<Sale | null>(null);
  const [itemQuery, setItemQuery] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      customerId: '',
      date: new Date(),
      items: [],
      discountType: 'none',
      discountValue: 0,
      paymentMethod: 'Cash',
      amountPaid: 0,
      splitPaymentMethod: 'Cash',
      creditApplied: 0,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');
  const watchCustomerId = form.watch('customerId');
  const watchDiscountType = form.watch('discountType');
  const watchDiscountValue = form.watch('discountValue') || 0;
  const watchPaymentMethod = form.watch('paymentMethod');
  const watchAmountPaid = form.watch('amountPaid') || 0;

  const selectedCustomer = React.useMemo(
    () => customers.find(c => c.id === watchCustomerId),
    [customers, watchCustomerId]
  );
  const customerCredit = React.useMemo(
    () => (selectedCustomer && selectedCustomer.dueBalance < 0) ? Math.abs(selectedCustomer.dueBalance) : 0,
    [selectedCustomer]
  );

  const resetForm = React.useCallback(() => {
    const walkInCustomer = customers.find(c => c.name === 'Walk-in Customer');
    form.reset({
      customerId: walkInCustomer?.id || '',
      date: new Date(),
      items: [],
      discountType: 'none',
      discountValue: 0,
      paymentMethod: 'Cash',
      amountPaid: 0,
      splitPaymentMethod: 'Cash',
      creditApplied: 0,
    });
    setCompletedSale(null);
    setItemQuery('');
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [customers, form]);

  React.useEffect(() => {
    if (isOpen) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ---- item search ----
  const inStockItems = React.useMemo(() => items.filter(i => i.stock > 0), [items]);

  const searchResults = React.useMemo(() => {
    const q = itemQuery.toLowerCase().trim();
    const base = q
      ? inStockItems.filter(
          i =>
            i.title.toLowerCase().includes(q) ||
            (i.author || '').toLowerCase().includes(q) ||
            i.categoryName.toLowerCase().includes(q)
        )
      : inStockItems;
    return base.slice(0, 40);
  }, [inStockItems, itemQuery]);

  const quantityInCart = React.useCallback(
    (itemId: string) => watchItems.find(i => i.itemId === itemId)?.quantity || 0,
    [watchItems]
  );

  const addItemToCart = React.useCallback(
    (item: Item) => {
      const existingIndex = fields.findIndex(f => f.itemId === item.id);
      if (existingIndex >= 0) {
        const current = watchItems[existingIndex];
        if (current.quantity >= item.stock) {
          toast({ variant: 'destructive', title: 'Stock limit', description: `Only ${item.stock} copies of "${item.title}" in stock.` });
          return;
        }
        update(existingIndex, { ...current, quantity: current.quantity + 1 });
      } else {
        append({ itemId: item.id, quantity: 1, price: item.sellingPrice });
      }
    },
    [fields, watchItems, append, update, toast]
  );

  const handleItemSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      addItemToCart(searchResults[0]);
    }
  };

  const changeQuantity = (index: number, delta: number) => {
    const item = watchItems[index];
    if (!item) return;
    const itemData = items.find(i => i.id === item.itemId);
    const max = itemData?.stock ?? 999;
    const next = Math.min(Math.max(1, item.quantity + delta), max);
    update(index, { ...item, quantity: next });
  };

  // ---- totals ----
  const subtotal = React.useMemo(
    () => watchItems.reduce((acc, item) => acc + (item.price || 0) * (Number(item.quantity) || 0), 0),
    [watchItems]
  );

  const discountAmount = React.useMemo(() => {
    let disc = 0;
    if (watchDiscountType === 'percentage') disc = subtotal * (Number(watchDiscountValue) / 100);
    else if (watchDiscountType === 'amount') disc = Number(watchDiscountValue);
    return Math.min(subtotal, disc);
  }, [subtotal, watchDiscountType, watchDiscountValue]);

  const total = subtotal - discountAmount;
  const creditToApply = Math.min(total, customerCredit);
  const totalAfterCredit = total - creditToApply;
  const dueAmount =
    watchPaymentMethod === 'Due' ? totalAfterCredit
    : watchPaymentMethod === 'Split' ? Math.max(0, totalAfterCredit - (Number(watchAmountPaid) || 0))
    : 0;

  // Keep server-facing fields in sync (advance is applied automatically when
  // the selected customer has one).
  React.useEffect(() => {
    form.setValue('creditApplied', creditToApply);
    if (totalAfterCredit <= 0 && total > 0) {
      if (watchPaymentMethod !== 'Paid by Credit') form.setValue('paymentMethod', 'Paid by Credit');
    } else if (watchPaymentMethod === 'Paid by Credit') {
      form.setValue('paymentMethod', 'Cash');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditToApply, totalAfterCredit, total]);

  const cartCount = watchItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

  const onSubmit = (data: SaleFormValues) => {
    startTransition(async () => {
      try {
        const saleData = {
          ...data,
          date: data.date.toISOString(),
        };
        const result = await addSale(userId, saleData);

        if (result?.success && result.sale) {
          toast({ title: 'Sale Recorded', description: 'The new sale has been added to the history.' });
          setCompletedSale(result.sale);
          onSuccess();
        } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to record sale.' });
        }
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to record sale.' });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setCompletedSale(null);
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] flex flex-col">
        {completedSale && authUser ? (
          <SaleMemo
            sale={completedSale}
            customer={customers.find(c => c.id === completedSale.customerId)!}
            items={items}
            onNewSale={resetForm}
            user={authUser}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" /> New Sale
              </DialogTitle>
              <DialogDescription>
                Search a book and press Enter to add it to the cart — the whole sale happens on this one screen.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                {/* Scrollable content: customer, date, book panels, payment,
                    and the confirm button all flow in one scroll area. */}
                <div className="flex-1 min-h-0 overflow-y-auto px-1">
                {/* Customer + date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Customer</FormLabel>
                        <FormControl>
                          <SearchSelect
                            options={customers.map(c => ({
                              value: c.id,
                              label: c.name,
                              hint: c.dueBalance < 0
                                ? `Advance available: ${formatTaka(Math.abs(c.dueBalance))}`
                                : c.dueBalance > 0
                                  ? `Owes: ${formatTaka(c.dueBalance)}`
                                  : c.phone !== 'N/A' ? c.phone : undefined,
                            }))}
                            value={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Select a customer"
                            searchPlaceholder="Type a customer name..."
                            aria-label="Customer"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sale Date</FormLabel>
                        <FormControl>
                          <DateField value={field.value} onChange={field.onChange} aria-label="Sale date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Main two panels */}
                <div className="grid grid-cols-1 lg:grid-cols-2 lg:h-[42vh] gap-4 pb-1">
                  {/* LEFT: item search */}
                  <div className="flex flex-col h-[230px] lg:h-auto border rounded-lg bg-card overflow-hidden">
                    <div className="p-3 border-b">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          ref={searchInputRef}
                          placeholder="Search by title, author, or category…"
                          className="pl-8"
                          value={itemQuery}
                          onChange={(e) => setItemQuery(e.target.value)}
                          onKeyDown={handleItemSearchKeyDown}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Press <kbd className="px-1 py-0.5 border rounded bg-muted text-[10px]">Enter</kbd> to add the first result. Clicking an item adds another copy.
                      </p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {searchResults.length === 0 ? (
                        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                          {itemQuery ? `No items match “${itemQuery}”.` : 'No items in stock.'}
                        </p>
                      ) : (
                        searchResults.map(item => {
                          const inCart = quantityInCart(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => addItemToCart(item)}
                              className={cn(
                                'w-full flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent transition-colors',
                                inCart > 0 && 'bg-accent/60'
                              )}
                            >
                              <span className="flex min-w-0 flex-col">
                                <span className="truncate font-medium">{item.title}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                  {[item.author, item.categoryName].filter(Boolean).join(' · ')}
                                </span>
                              </span>
                              <span className="flex items-center gap-2 shrink-0">
                                {inCart > 0 && (
                                  <Badge variant="secondary" className="font-mono">×{inCart}</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">({item.stock})</span>
                                <span className="font-medium">{formatTaka(item.sellingPrice)}</span>
                                <Plus className="h-4 w-4 text-primary" />
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* RIGHT: cart */}
                  <div className="flex flex-col h-[230px] lg:h-auto border rounded-lg bg-muted/30 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b">
                      <FormLabel className="text-sm font-semibold">Cart</FormLabel>
                      {cartCount > 0 && (
                        <Badge variant="secondary">{cartCount} item{cartCount !== 1 ? 's' : ''}</Badge>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {fields.length === 0 ? (
                        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                          Cart is empty — search on the left and click a book.
                        </p>
                      ) : (
                        fields.map((field, index) => {
                          const item = watchItems[index];
                          const itemData = items.find(i => i.id === item?.itemId);
                          return (
                            <div key={field.id} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-medium">{itemData?.title || 'Unknown Item'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatTaka(item?.price || 0)} each · {formatTaka((item?.price || 0) * (Number(item?.quantity) || 0))} total
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button type="button" variant="outline" size="icon" className="h-7 w-7" aria-label="Decrease quantity" onClick={() => changeQuantity(index, -1)} disabled={(item?.quantity || 0) <= 1}>
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min={1}
                                  max={itemData?.stock}
                                  className="h-7 w-14 text-center px-1"
                                  value={item?.quantity ?? 1}
                                  onChange={(e) => {
                                    const next = Math.min(Math.max(1, Number(e.target.value) || 1), itemData?.stock ?? 999);
                                    if (item) update(index, { ...item, quantity: next });
                                  }}
                                />
                                <Button type="button" variant="outline" size="icon" className="h-7 w-7" aria-label="Increase quantity" onClick={() => changeQuantity(index, 1)} disabled={item ? item.quantity >= (itemData?.stock ?? 999) : true}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" aria-label="Remove item" onClick={() => remove(index)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment + totals — scrolls with the rest of the dialog */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3 pt-3 border-t">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="discountType"
                        render={({ field }) => (
                          <FormItem className="w-32">
                            <FormLabel>Discount</FormLabel>
                            <SelectSimple
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="discountValue"
                        render={({ field }) => (
                          <FormItem className={cn('flex-1', watchDiscountType === 'none' && 'opacity-50 pointer-events-none')}>
                            <FormLabel>{watchDiscountType === 'percentage' ? 'Percent (%)' : 'Amount (৳)'}</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <FormControl>
                            <div className="flex flex-wrap gap-2">
                              {(['Cash', 'Bank', 'Due', 'Split'] as const).map(method => (
                                <button
                                  key={method}
                                  type="button"
                                  onClick={() => field.onChange(method)}
                                  className={cn(
                                    'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                                    field.value === method
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-card hover:bg-accent'
                                  )}
                                >
                                  {method}
                                </button>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchPaymentMethod === 'Split' && (
                      <div className="flex gap-2">
                        <FormField
                          control={form.control}
                          name="amountPaid"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Amount Paid Now (৳)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="Enter amount paid" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="splitPaymentMethod"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Paid Via</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  {(['Cash', 'Bank'] as const).map(method => (
                                    <button
                                      key={method}
                                      type="button"
                                      onClick={() => field.onChange(method)}
                                      className={cn(
                                        'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                                        field.value === method
                                          ? 'bg-primary text-primary-foreground border-primary'
                                          : 'bg-card hover:bg-accent'
                                      )}
                                    >
                                      {method}
                                    </button>
                                  ))}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border bg-card p-4 text-sm space-y-1.5 self-start w-full">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatTaka(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-green-700">
                      <span>Discount{watchDiscountType === 'percentage' && watchDiscountValue ? ` (${watchDiscountValue}%)` : ''}</span>
                      <span>-{formatTaka(discountAmount)}</span>
                    </div>
                    {creditToApply > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Customer advance used</span>
                        <span>-{formatTaka(creditToApply)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t pt-2">
                      <span>Total to collect</span>
                      <span>{formatTaka(totalAfterCredit)}</span>
                    </div>
                    {dueAmount > 0 && (
                      <div className="flex justify-between font-semibold text-destructive">
                        <span>Due after this sale</span>
                        <span>{formatTaka(dueAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="pt-3 pb-1">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full sm:w-auto"
                    disabled={isPending || watchItems.length === 0 || !form.formState.isValid}
                  >
                    {isPending
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming…</>
                      : `Confirm Sale — ${formatTaka(totalAfterCredit)}`}
                  </Button>
                </DialogFooter>
                </div>{/* end scrollable content */}
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SelectSimple({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1">
      {([
        { v: 'none', label: 'None' },
        { v: 'percentage', label: '%' },
        { v: 'amount', label: '৳' },
      ] as const).map(opt => (
        <button
          key={opt.v}
          type="button"
          onClick={() => onChange(opt.v)}
          className={cn(
            'flex-1 rounded-md border px-2 py-2 text-sm font-medium transition-colors',
            value === opt.v ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-accent'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
