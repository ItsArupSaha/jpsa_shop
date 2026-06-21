import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { CustomerWithDue, Transaction } from '@/lib/types';
import type { DateRange } from 'react-day-picker';

interface AuthUserProps {
  companyName?: string;
  address?: string;
  phone?: string;
  bkashNumber?: string;
  bankInfo?: string;
}

function drawCompanyHeader(doc: jsPDF, authUser: AuthUserProps) {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(authUser.companyName || 'Bookstore', 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(authUser.address || '', 14, 26);
  doc.text(authUser.phone || '', 14, 32);

  // Right side header
  let yPos = 20;
  if (authUser.bkashNumber) {
    doc.text(`Bkash: ${authUser.bkashNumber}`, 200, yPos, { align: 'right' });
    yPos += 6;
  }
  if (authUser.bankInfo) {
    doc.text(`Bank: ${authUser.bankInfo}`, 200, yPos, { align: 'right' });
  }
}

export function generatePdf(data: CustomerWithDue[], date: Date | undefined, authUser: AuthUserProps) {
  const doc = new jsPDF();
  const validDate = date && !isNaN(date.getTime()) ? date : new Date();
  const dateString = format(validDate, 'PPP');
  const totalDue = data.reduce((sum, c) => sum + (c.dueBalance || 0), 0);

  drawCompanyHeader(doc, authUser);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Pending Receivables Report', 105, 45, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`As of ${dateString}`, 105, 51, { align: 'center' });
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 60,
    head: [['Customer', 'Phone', 'Due Amount']],
    body: data.map(c => [
      c.name,
      c.phone,
      `BDT ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(c.dueBalance)}`
    ]),
    foot: [[
      { content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
      `BDT ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalDue)}`
    ]],
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
  });
  doc.save(`pending-receivables-${format(validDate, 'yyyy-MM-dd')}.pdf`);
}

export function generateXlsx(data: CustomerWithDue[], date?: Date) {
  const validDate = date && !isNaN(date.getTime()) ? date : new Date();
  const dataToExport = data.map(c => ({ 'Customer': c.name, 'Phone': c.phone, 'Due Amount': c.dueBalance }));
  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Receivables');
  XLSX.writeFile(workbook, `pending-receivables-${format(validDate, 'yyyy-MM-dd')}.xlsx`);
}

export function generateReceivedPaymentsPdf(data: Transaction[], dateRange: DateRange | undefined, authUser: AuthUserProps) {
  const doc = new jsPDF();
  const dateString = dateRange
    ? `${format(dateRange.from!, 'PPP')} - ${dateRange.to ? format(dateRange.to, 'PPP') : ''}`
    : '';

  drawCompanyHeader(doc, authUser);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Received Payments Report', 105, 45, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(dateString, 105, 51, { align: 'center' });
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 60,
    head: [['Date', 'Customer', 'Method', 'Amount']],
    body: data.map(t => [
      format(new Date(t.dueDate), 'PPP'),
      t.customerName || 'N/A',
      t.paymentMethod || 'N/A',
      `BDT ${t.amount.toFixed(2)}`
    ])
  });
  doc.save(`received-payments-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function generateReceivedPaymentsXlsx(data: Transaction[]) {
  const dataToExport = data.map(t => ({
    'Date': format(new Date(t.dueDate), 'yyyy-MM-dd'),
    'Customer': t.customerName,
    'Method': t.paymentMethod,
    'Amount': t.amount
  }));
  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Received Payments');
  XLSX.writeFile(workbook, `received-payments-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}
