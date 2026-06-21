import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Donation } from '@/lib/types';

export function exportDonationsToPdf(
  filteredDonations: Donation[],
  authUser: {
    companyName?: string;
    address?: string;
    phone?: string;
    bkashNumber?: string;
    bankInfo?: string;
  } | null,
  dateRange: { from: Date; to?: Date }
) {
  if (!authUser) return;

  const doc = new jsPDF();
  const dateString = `${format(dateRange.from, 'PPP')} - ${format(dateRange.to || dateRange.from, 'PPP')}`;
  const totalDonations = filteredDonations.reduce((sum, d) => sum + d.amount, 0);

  // Left side header
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

  // Report Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Donations Report', 105, 45, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`For the period: ${dateString}`, 105, 51, { align: 'center' });
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 60,
    head: [['Date', 'Donation ID', 'Donor', 'Method', 'Notes', 'Amount']],
    body: filteredDonations.map(d => [
      format(new Date(d.date), 'yyyy-MM-dd'),
      d.donationId || 'N/A',
      d.donorName,
      d.paymentMethod,
      d.notes || '',
      `BDT ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.amount)}`
    ]),
    foot: [
      [{ content: 'Total', colSpan: 5, styles: { halign: 'right' } }, `BDT ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalDonations)}`],
    ],
    footStyles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0] },
  });

  const fromStr = format(dateRange.from, 'yyyy-MM-dd');
  const toStr = format(dateRange.to || dateRange.from, 'yyyy-MM-dd');
  doc.save(`donations-report-${fromStr}-to-${toStr}.pdf`);
}

export function exportDonationsToXlsx(
  filteredDonations: Donation[],
  dateRange: { from: Date; to?: Date }
) {
  const dataToExport = filteredDonations.map(d => ({
    'Date': format(new Date(d.date), 'yyyy-MM-dd'),
    'Donation ID': d.donationId || 'N/A',
    'Donor Name': d.donorName,
    'Payment Method': d.paymentMethod,
    'Amount': d.amount,
    'Notes': d.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);

  // Auto-fit columns
  const columnWidths = Object.keys(dataToExport[0]).map(key => {
    const maxLength = Math.max(
      ...dataToExport.map(row => {
        const value = row[key as keyof typeof row];
        return typeof value === 'number' ? String(value).length : (value || '').length;
      }),
      key.length
    );
    return { wch: maxLength + 2 };
  });
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Donations');
  const fromStr = format(dateRange.from, 'yyyy-MM-dd');
  const toStr = format(dateRange.to || dateRange.from, 'yyyy-MM-dd');
  XLSX.writeFile(workbook, `donations-report-${fromStr}-to-${toStr}.xlsx`);
}
