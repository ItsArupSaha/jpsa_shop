
'use client';

import type { AuthUser, Book, Customer, Sale } from '@/lib/types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, PlusCircle } from 'lucide-react';
import { Button } from './ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface SaleMemoProps {
  sale: Sale;
  customer: Customer;
  books: Book[];
  user: AuthUser;
  onNewSale: () => void;
}

export function SaleMemo({ sale, customer, books, user, onNewSale }: SaleMemoProps) {
  const getBookTitle = (bookId: string) => books.find(b => b.id === bookId)?.title || 'Unknown Book';

  const generatePdf = () => {
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
    doc.text(customer.name, 14, infoY + 5);
    doc.text(customer.address, 14, infoY + 10);
    doc.text(customer.phone, 14, infoY + 15);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice #:', 140, infoY);
    doc.text('Date:', 140, infoY + 5);
    doc.text('Payment:', 140, infoY + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.text(sale.saleId, 165, infoY);
    doc.text(format(new Date(sale.date), 'PPP'), 165, infoY + 5);
    doc.text(sale.paymentMethod, 165, infoY + 10);


    // Table
    const tableData = sale.items.map(item => [
      getBookTitle(item.bookId),
      item.quantity,
      `$${item.price.toFixed(2)}`,
      `$${(item.quantity * item.price).toFixed(2)}`
    ]);

    const footContent = [
        [{ content: 'Subtotal', colSpan: 3, styles: { halign: 'right' } }, `$${sale.subtotal.toFixed(2)}`],
        [{ content: 'Discount', colSpan: 3, styles: { halign: 'right' } }, `-$${(sale.subtotal - sale.total).toFixed(2)}`],
        [{ content: 'Grand Total', colSpan: 3, styles: { halign: 'right', fontSize: 12 } }, `$${sale.total.toFixed(2)}`],
    ];

    if (sale.paymentMethod === 'Split') {
        const dueAmount = sale.total - (sale.amountPaid || 0);
        footContent.push(
            [{ content: 'Amount Paid', colSpan: 3, styles: { halign: 'right' as const } }, `$${sale.amountPaid?.toFixed(2)}`],
            [{ content: 'Amount Due', colSpan: 3, styles: { halign: 'right' as const } }, `$${dueAmount.toFixed(2)}`]
        );
    }
     if (sale.paymentMethod === 'Due') {
        footContent.push(
            [{ content: 'Amount Due', colSpan: 3, styles: { halign: 'right' as const } }, `$${sale.total.toFixed(2)}`]
        );
    }

    autoTable(doc, {
      startY: infoY + 25,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [48, 103, 84] }, // #306754
      footStyles: { fillColor: [255, 255, 255], textColor: [0,0,0], fontStyle: 'bold' },
      foot: footContent as any,
    });

    // Footer
    let finalY = (doc as any).lastAutoTable.finalY || doc.internal.pageSize.getHeight() - 30;
    doc.setFontSize(10);
    doc.text('Thank you for your business!', 105, finalY + 20, { align: 'center' });

    doc.save(`memo-${sale.saleId}.pdf`);
  };

  const dueAmount = sale.total - (sale.amountPaid || 0);

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
                                <TableCell className="font-medium">{getBookTitle(item.bookId)}</TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">${(item.quantity * item.price).toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                
                <Separator className="my-4" />

                <div className="space-y-2 text-sm pr-4">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>${sale.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                        <span>Discount</span>
                        <span>-${(sale.subtotal - sale.total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t pt-2">
                        <span>Grand Total</span>
                        <span>${sale.total.toFixed(2)}</span>
                    </div>
                    {sale.paymentMethod === 'Split' && (
                        <>
                            <div className="flex justify-between text-primary">
                                <span>Amount Paid</span>
                                <span>${sale.amountPaid?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-destructive">
                                <span>Amount Due</span>
                                <span>${dueAmount.toFixed(2)}</span>
                            </div>
                        </>
                    )}
                    {sale.paymentMethod === 'Due' && (
                        <div className="flex justify-between text-destructive">
                            <span>Amount Due</span>
                            <span>${sale.total.toFixed(2)}</span>
                        </div>
                    )}
                </div>

            </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-4">
            <Button variant="outline" onClick={onNewSale}>
                <PlusCircle className="mr-2 h-4 w-4"/> New Sale
            </Button>
            <Button onClick={generatePdf}>
                <Download className="mr-2 h-4 w-4" />
                Download Memo
            </Button>
        </DialogFooter>
    </>
  );
}
