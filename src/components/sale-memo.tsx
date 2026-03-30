
'use client';

import type { AuthUser, Customer, Item, Sale } from '@/lib/types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, PlusCircle } from 'lucide-react';
import { Button } from './ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

import { getSaleTransaction } from '@/lib/actions';
import React from 'react';

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

    const generatePdf = async () => {
        let currentPaymentMethod: string = sale.paymentMethod;
        let displayDue = 0;

        if (sale.paymentMethod === 'Due') {
            displayDue = sale.total;
        } else if (sale.paymentMethod === 'Split') {
            displayDue = sale.total - (sale.amountPaid || 0);
        }

        if (sale.paymentMethod === 'Due' || sale.paymentMethod === 'Split') {
            const transaction = await getSaleTransaction(user.uid, sale.saleId);
            if (transaction) {
                if (transaction.status === 'Paid') {
                    currentPaymentMethod = 'Paid';
                    displayDue = 0;
                } else {
                    displayDue = transaction.amount;
                }
            }
        }

        const doc = new jsPDF();
        const companyName = user.companyName || 'Bookstore';
        const address = user.address || '';
        const phone = user.phone || '';

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text(companyName, 14, 22);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(address, 14, 28);
        doc.text(phone, 14, 32);

        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', 200, 22, { align: 'right' });

        // Customer & Invoice Info
        const infoY = 45;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('BILL TO', 14, infoY);
        doc.setFont('helvetica', 'normal');
        const nameLines = doc.splitTextToSize(customer.name || '', 110);
        doc.text(nameLines, 14, infoY + 5);
        const addressY = infoY + 5 + (nameLines.length * 5);
        const addressLines = doc.splitTextToSize(customer.address || '', 110);
        doc.text(addressLines, 14, addressY);
        const phoneY = addressY + (addressLines.length * 5);
        doc.text(customer.phone || '', 14, phoneY);

        doc.setFont('helvetica', 'bold');
        doc.text('Invoice #:', 140, infoY);
        doc.text('Date:', 140, infoY + 5);
        doc.text('Status:', 140, infoY + 10);

        doc.setFont('helvetica', 'normal');
        doc.text(sale.saleId, 165, infoY);
        doc.text(format(new Date(sale.date), 'PPP'), 165, infoY + 5);
        doc.text(currentPaymentMethod, 165, infoY + 10);


        // Table
        const tableData = sale.items.map(item => [
            getItemTitle(item.itemId),
            item.quantity,
            `TK ${item.price.toFixed(2)}`,
            `TK ${(item.quantity * item.price).toFixed(2)}`
        ]);

        const footContent = [
            [{ content: 'Subtotal', colSpan: 3, styles: { halign: 'right', textColor: [100, 100, 100] } }, { content: `TK ${sale.subtotal.toFixed(2)}`, styles: { textColor: [100, 100, 100] } }],
            [{ content: `Discount${sale.discountType === 'percentage' ? ` (${sale.discountValue}%)` : ''}`, colSpan: 3, styles: { halign: 'right', textColor: [34, 197, 94] } }, { content: `-TK ${(sale.subtotal - sale.total).toFixed(2)}`, styles: { textColor: [34, 197, 94] } }],
            [{ content: 'Grand Total', colSpan: 3, styles: { halign: 'right', fontSize: 12, textColor: [0, 0, 0] } }, { content: `TK ${sale.total.toFixed(2)}`, styles: { textColor: [0, 0, 0], fontSize: 12 } }],
        ];

        if (displayDue > 0) {
            footContent.push(
                [{ content: 'Remaining Due', colSpan: 3, styles: { halign: 'right' as const, textColor: [220, 38, 38] } }, { content: `TK ${displayDue.toFixed(2)}`, styles: { textColor: [220, 38, 38] } }]
            );
        } else if (sale.paymentMethod === 'Due' || sale.paymentMethod === 'Split') {
            footContent.push(
                [{ content: 'Status', colSpan: 3, styles: { halign: 'right' as const, textColor: [34, 197, 94] } }, { content: `PAID`, styles: { textColor: [34, 197, 94] } }]
            );
        }

        autoTable(doc, {
            startY: Math.max(infoY + 25, phoneY + 10),
            head: [['Description', 'Qty', 'Unit Price', 'Total']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [48, 103, 84] }, // #306754
            footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
            foot: footContent as any,
        });

        // Footer
        let finalY = (doc as any).lastAutoTable.finalY || doc.internal.pageSize.getHeight() - 30;
        doc.setFontSize(10);
        doc.text('Thank you. Relish the nectar of Srila Gurumaharaja.', 105, finalY + 20, { align: 'center' });

        doc.save(`memo-${sale.saleId}-${customer.name}.pdf`);
    };

    const displayDueAmount = status === 'Paid' ? 0 : (currentDue !== null ? currentDue : (sale.total - (sale.amountPaid || 0)));

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
                        </div>
                    </div>

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
                                    <TableCell className="text-right">TK {(item.quantity * item.price).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <Separator className="my-4" />

                    <div className="space-y-2 text-sm pr-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>TK {sale.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-green-600">
                            <span>Discount{sale.discountType === 'percentage' ? ` (${sale.discountValue}%)` : ''}</span>
                            <span>-TK {(sale.subtotal - sale.total).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-base border-t pt-2">
                            <span>Grand Total</span>
                            <span>TK {sale.total.toFixed(2)}</span>
                        </div>

                        {(sale.paymentMethod === 'Due' || sale.paymentMethod === 'Split') && (
                            <div className="flex justify-between font-bold pt-2">
                                <span className={status === 'Paid' ? 'text-green-600' : 'text-destructive'}>Remaining Due</span>
                                <span className={status === 'Paid' ? 'text-green-600' : 'text-destructive'}>TK {displayDueAmount.toFixed(2)}</span>
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
