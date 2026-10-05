
'use client';

import type { AuthUser, Customer, Item, Sale } from '@/lib/types';
import { format } from 'date-fns';
import { Download, Gift, PlusCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

import { getSaleTransaction } from '@/lib/actions';
import React from 'react';
import { formatTaka } from '@/lib/format';
import { generateSaleMemoPdf } from './sale-memo-pdf';

interface SaleMemoProps {
    sale: Sale;
    customer: Customer;
    items: Item[];
    user: AuthUser;
    onNewSale: () => void;
}

export function SaleMemo({ sale, customer, items, user, onNewSale }: SaleMemoProps) {
    const [currentDue, setCurrentDue] = React.useState<number | null>(null);
    const [status, setStatus] = React.useState<string | null>(null);

    const getItemTitle = (itemId: string) => items.find(i => i.id === itemId)?.title || 'Unknown Item';

    React.useEffect(() => {
        const fetchStatus = async () => {
            if (sale.paymentMethod !== 'Due' && sale.paymentMethod !== 'Split') return;
            try {
                const transaction = await getSaleTransaction(user.uid, sale.saleId);
                if (transaction) {
                    setCurrentDue(transaction.status === 'Paid' ? 0 : transaction.amount);
                    setStatus(transaction.status);
                }
            } catch (e) {
                console.error("Failed to fetch sale status", e);
            }
        };
        fetchStatus();
    }, [sale.saleId, sale.paymentMethod, user.uid]);

    const generatePdf = () => generateSaleMemoPdf({ sale, customer, items, user });

    const displayDueAmount = status === 'Paid' ? 0 : (currentDue !== null ? currentDue : Math.max(0, sale.total - (sale.creditApplied || 0) - (sale.amountPaid || 0)));

    return (
        <>
            <DialogHeader>
                <DialogTitle className="font-headline text-2xl">Sale Confirmed!</DialogTitle>
                <DialogDescription>
                    The sale has been recorded successfully. You can now download the memo.
                </DialogDescription>
            </DialogHeader>

            <div className="max-h-[60vh] overflow-y-auto p-1 pr-2">
                <div className="text-sm p-4 border rounded-lg">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <h3 className="font-semibold mb-1">Billed To</h3>
                            <p>{customer.name}</p>
                            <p>{customer.address}</p>
                        </div>
                        <div className="text-right">
                            <p><span className="font-semibold">Invoice #:</span> {sale.saleId}</p>
                            <p><span className="font-semibold">Date:</span> {format(new Date(sale.date), 'PPP')}</p>
                            <p><span className="font-semibold">Status:</span> <span className={status === 'Paid' ? 'text-green-600 font-bold' : ''}>{status === 'Paid' ? 'PAID' : sale.paymentMethod}</span></p>
                            {sale.packageName && (
                                <p><span className="font-semibold">Package:</span> <span className="text-primary font-medium">{sale.packageName}</span></p>
                            )}
                        </div>
                    </div>

                    {sale.gifts && sale.gifts.length > 0 && (
                        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md">
                            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1.5 flex items-center gap-1">
                                <Gift className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Free Gifts Included:
                            </p>
                            <ul className="list-disc list-inside space-y-1 pl-1">
                                {sale.gifts.map((g, idx) => (
                                    <li key={idx} className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                        {g}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-center">Qty</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sale.items.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{getItemTitle(item.itemId)}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{formatTaka(item.quantity * item.price)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <Separator className="my-4" />

                    <div className="space-y-2 text-sm pr-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatTaka(sale.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-green-600">
                            <span>Discount{sale.discountType === 'percentage' ? ` (${sale.discountValue}%)` : ''}</span>
                            <span>-{formatTaka(sale.subtotal - sale.total)}</span>
                        </div>
                        {sale.creditApplied && sale.creditApplied > 0 && (
                            <div className="flex justify-between text-muted-foreground">
                                <span>Paid from Advance</span>
                                <span>-{formatTaka(sale.creditApplied)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-base border-t pt-2">
                            <span>Grand Total</span>
                            <span>{formatTaka(sale.total - (sale.creditApplied || 0))}</span>
                        </div>

                        {(sale.paymentMethod === 'Due' || sale.paymentMethod === 'Split') && (
                            <div className="flex justify-between font-bold pt-2">
                                <span className={status === 'Paid' ? 'text-green-600' : 'text-destructive'}>Remaining Due</span>
                                <span className={status === 'Paid' ? 'text-green-600' : 'text-destructive'}>{formatTaka(displayDueAmount)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-4">

                <Button variant="outline" onClick={onNewSale}>
                    <PlusCircle className="mr-2 h-4 w-4" /> New Sale
                </Button>
                <Button onClick={generatePdf}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Memo
                </Button>
            </DialogFooter>
        </>
    );
}
