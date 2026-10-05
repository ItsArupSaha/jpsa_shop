import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatTakaPlain } from '@/lib/format';
import type { ClosingStock } from '@/lib/types';

interface AuthUserProps {
  companyName?: string;
  address?: string;
  phone?: string;
  bkashNumber?: string;
  bankInfo?: string;
}

export function exportClosingStockPdf(
  closingStockData: ClosingStock[],
  closingStockDate: Date,
  authUser: AuthUserProps | null
) {
  if (!closingStockData.length || !closingStockDate || !authUser) return;

  const doc = new jsPDF();
  const dateString = format(closingStockDate, 'dd MMM yyyy');
  const totalStockValue = closingStockData.reduce(
    (sum, item) => sum + (item.closingStock > 0 ? item.closingStock * item.productionPrice : 0),
    0
  );

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(authUser.companyName || 'Store', 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(authUser.address || '', 14, 26);
  doc.text(authUser.phone || '', 14, 32);

  let yPos = 20;
  if (authUser.bkashNumber) {
    doc.text(`Bkash: ${authUser.bkashNumber}`, 200, yPos, { align: 'right' });
    yPos += 6;
  }
  if (authUser.bankInfo) {
    doc.text(`Bank: ${authUser.bankInfo}`, 200, yPos, { align: 'right' });
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Closing Stock Report', 105, 45, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`As of ${dateString}`, 105, 51, { align: 'center' });
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 60,
    head: [['Title', 'Category', 'Author', 'Cost Price', 'Selling Price', 'Stock', 'Stock Value']],
    body: closingStockData.map(item => [
      item.title,
      item.categoryName,
      item.author || '-',
      formatTakaPlain(item.productionPrice),
      formatTakaPlain(item.sellingPrice),
      item.closingStock,
      formatTakaPlain(item.closingStock > 0 ? item.closingStock * item.productionPrice : 0),
    ]),
    foot: [['', '', '', '', '', 'Total', formatTakaPlain(totalStockValue)]],
    footStyles: { fontStyle: 'bold' },
  });

  doc.save(`closing-stock-report-${format(closingStockDate, 'yyyy-MM-dd')}.pdf`);
}

export function exportClosingStockXlsx(
  closingStockData: ClosingStock[],
  closingStockDate: Date
) {
  if (!closingStockData.length || !closingStockDate) return;

  const dataToExport = closingStockData.map(item => ({
    Title: item.title,
    Category: item.categoryName,
    Author: item.author || '-',
    'Cost Price': item.productionPrice,
    'Selling Price': item.sellingPrice,
    Stock: item.closingStock,
    'Stock Value': item.closingStock > 0 ? item.closingStock * item.productionPrice : 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);

  const columnWidths = Object.keys(dataToExport[0]).map(key => {
    const maxLength = Math.max(
      ...dataToExport.map(row => String(row[key as keyof typeof row]).length),
      key.length
    );
    return { wch: maxLength + 2 };
  });
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Closing Stock');
  XLSX.writeFile(workbook, `closing-stock-report-${format(closingStockDate, 'yyyy-MM-dd')}.xlsx`);
}
