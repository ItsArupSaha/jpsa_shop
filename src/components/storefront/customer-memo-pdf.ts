import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatTakaPlain } from '@/lib/format';

export interface CustomerMemoData {
  saleId: string;
  date: Date | string | number;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  district?: string;
  paymentMethod: string;
  transactionId?: string;
  orderNote?: string;
  items: Array<{
    title: string;
    quantity: number;
    price: number;
  }>;
  total: number;
}

export function generateCustomerMemoPdf(data: CustomerMemoData) {
  const doc = new jsPDF();

  // Primary brand header (#631038 / Plum)
  doc.setFillColor(99, 16, 56);
  doc.rect(0, 0, 210, 32, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('VICTORY FLAG PUBLICATIONS', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(245, 176, 65); // gold
  doc.text('JPS Archives BD Branch | Sri Sri Radha Madhava Mandir, ISKCON', 14, 21);

  doc.setFontSize(8);
  doc.setTextColor(230, 230, 230);
  doc.text('Help: +880 1902 962441 | Web: https://jayapatakaswamiarchives.net', 14, 26);

  // INVOICE / MEMO Badge on the right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('ORDER MEMO', 196, 17, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(245, 176, 65);
  doc.text(`#${data.saleId}`, 196, 23, { align: 'right' });

  // Bill To & Order Info Box
  const infoY = 42;

  // Bill To Left Column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(99, 16, 56);
  doc.text('BILL & SHIP TO:', 14, infoY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 34, 41);
  const nameLines = doc.splitTextToSize(data.customerName || 'Customer', 100);
  doc.text(nameLines, 14, infoY + 6);

  const phoneY = infoY + 6 + nameLines.length * 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text(`Phone: ${data.customerPhone || 'N/A'}`, 14, phoneY);

  const addressY = phoneY + 5;
  const fullAddress = `${data.shippingAddress || ''}${data.district ? `, ${data.district}` : ''}`;
  const addressLines = doc.splitTextToSize(fullAddress, 100);
  doc.text(addressLines, 14, addressY);

  // Right Column: Order Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(99, 16, 56);
  doc.text('ORDER DETAILS:', 130, infoY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text('Order ID:', 130, infoY + 6);
  doc.text('Order Date:', 130, infoY + 11);
  doc.text('Payment:', 130, infoY + 16);
  doc.text('Shipping:', 130, infoY + 21);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);
  doc.text(String(data.saleId), 162, infoY + 6);

  const orderDate = data.date ? new Date(data.date) : new Date();
  doc.text(format(orderDate, 'dd MMM yyyy, hh:mm a'), 162, infoY + 11);

  const paymentText =
    data.paymentMethod === 'Cash'
      ? 'Cash on Delivery'
      : `bKash/Nagad${data.transactionId ? ` (${data.transactionId})` : ''}`;
  doc.text(paymentText, 162, infoY + 16);

  doc.setTextColor(34, 139, 34); // green
  doc.setFont('helvetica', 'bold');
  doc.text('FREE Delivery (Tk 0)', 162, infoY + 21);

  // Items Table
  const tableData = data.items.map((item, index) => [
    String(index + 1),
    item.title,
    String(item.quantity),
    `${formatTakaPlain(item.price)}`,
    `${formatTakaPlain(item.quantity * item.price)}`,
  ]);

  const tableStartY = Math.max(addressY + addressLines.length * 5 + 6, infoY + 28);

  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Book / Item Description', 'Qty', 'Unit Price', 'Total Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [99, 16, 56], // #631038
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 30, 30],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 95 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    },
    foot: [
      [
        {
          content: 'Delivery Charge:',
          colSpan: 4,
          styles: { halign: 'right', textColor: [34, 139, 34], fontStyle: 'bold' },
        },
        {
          content: 'FREE (Tk 0)',
          styles: { halign: 'right', textColor: [34, 139, 34], fontStyle: 'bold' },
        },
      ],
      [
        {
          content: 'Grand Total Payable:',
          colSpan: 4,
          styles: { halign: 'right', fontSize: 11, fontStyle: 'bold', textColor: [99, 16, 56] },
        },
        {
          content: `${formatTakaPlain(data.total)}`,
          styles: { halign: 'right', fontSize: 11, fontStyle: 'bold', textColor: [99, 16, 56] },
        },
      ],
    ],
    footStyles: {
      fillColor: [253, 248, 245],
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 180;

  // Order Note if provided
  if (data.orderNote) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Customer Note:', 14, finalY + 8);
    doc.setFont('helvetica', 'italic');
    doc.text(doc.splitTextToSize(data.orderNote, 180), 14, finalY + 13);
  }

  // Footer Blessing & Security Note
  const footerBoxY = doc.internal.pageSize.getHeight() - 25;
  doc.setDrawColor(230, 225, 218);
  doc.setLineWidth(0.5);
  doc.line(14, footerBoxY, 196, footerBoxY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(99, 16, 56);
  doc.text('Thank you for purchasing Sri Sri Guru-Gauranga literature!', 105, footerBoxY + 6, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text(
    'Please preserve this receipt for your delivery reference. Hare Krishna!',
    105,
    footerBoxY + 11,
    { align: 'center' }
  );

  // Save the PDF file
  doc.save(`Order-Memo-${data.saleId}.pdf`);
}
