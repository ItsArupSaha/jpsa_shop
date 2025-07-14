'use client';

import * as React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { FileText } from 'lucide-react';
import type { Customer, Sale, Book } from '@/lib/types';

interface CustomerStatementPDFProps {
  customer: Customer;
  sales: Sale[];
  books: Book[];
}

export default function CustomerStatementPDF({ customer, sales, books }: CustomerStatementPDFProps) {
  const getBookTitle = (bookId: string) => books.find(b => b.id === bookId)?.title || 'Unknown Book';

  const generatePdf = () => {
    const doc = new jsPDF();

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Customer Statement', 105, 20, { align: 'center' });

    // Customer Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer:', 14, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(customer.name, 38, 40);
    doc.text(customer.address, 38, 46);
    doc.text(customer.phone, 38, 52);

    doc.setFont('helvetica', 'bold');
    doc.text('Date:', 140, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(), 'PPP'), 155, 40);


    // Table
    const tableData = sales.map(sale => {
      const itemsString = sale.items.map(i => `${i.quantity}x ${getBookTitle(i.bookId)}`).join('\n');
      return [
        format(new Date(sale.date), 'yyyy-MM-dd'),
        itemsString,
        sale.paymentMethod,
        `$${sale.total.toFixed(2)}`
      ];
    });

    autoTable(doc, {
      startY: 65,
      head: [['Date', 'Description', 'Payment Method', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [48, 103, 84] }, // #306754
      didParseCell: function (data) {
        if (data.column.dataKey === 1) { // Description column
          data.cell.styles.cellWidth = 'auto';
        }
      }
    });

    // Footer
    let finalY = (doc as any).lastAutoTable.finalY || 10;
    doc.setFontSize(10);
    doc.text('Thank you for your business!', 105, finalY + 20, { align: 'center' });

    doc.save(`statement-${customer.name.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <Button onClick={generatePdf} variant="outline">
      <FileText className="mr-2 h-4 w-4" />
      Download PDF
    </Button>
  );
}
