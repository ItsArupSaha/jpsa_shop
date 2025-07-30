
'use client';

import type { Book, Customer, Sale } from '@/lib/types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download } from 'lucide-react';
import { Button } from './ui/button';

interface DownloadSaleMemoProps {
  sale: Sale;
  customer: Customer;
  books: Book[];
}

export function DownloadSaleMemo({ sale, customer, books }: DownloadSaleMemoProps) {
  const getBookTitle = (bookId: string) => books.find(b => b.id === bookId)?.title || 'Unknown Book';

  const generatePdf = () => {
    const doc = new jsPDF();
    const bookTitle = 'Bookstore'; // Your bookstore name
    const address = '123 Bookworm Lane, Readsville, USA'; // Your address
    const phone = '555-123-4567'; // Your contact info

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(bookTitle, 14, 22);

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
    doc.text(sale.id.slice(0, 8).toUpperCase(), 165, infoY);
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

    doc.save(`memo-${sale.id.slice(0,6)}.pdf`);
  };

  return (
    <Button onClick={generatePdf} variant="ghost" size="icon" title="Download Memo">
        <Download className="h-4 w-4" />
    </Button>
  );
}

