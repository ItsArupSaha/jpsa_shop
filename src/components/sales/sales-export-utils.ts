import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Sale, Item, Customer, Transaction } from '@/lib/types';
import { getSales, getTransactionsForCustomer } from '@/lib/actions';
import type { DateRange } from 'react-day-picker';

function getOriginalDueAmount(sale: Sale) {
  if (sale.paymentMethod === 'Due') {
    return sale.total;
  }
  if (sale.paymentMethod === 'Split') {
    return Math.max(0, sale.total - (sale.amountPaid || 0));
  }
  return 0;
}

export async function getFilteredSales(userId: string, dateRange: DateRange | undefined) {
  if (!dateRange?.from) {
    throw new Error("Please select a start date.");
  }

  const allSales = await getSales(userId);
  const from = dateRange.from;
  const to = dateRange.to || dateRange.from;
  
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  return allSales.filter(sale => {
    const saleDate = new Date(sale.date);
    return saleDate >= start && saleDate <= end;
  });
}

export async function resolveExportBreakdownForSales(userId: string, salesToResolve: Sale[], reportEndDate: Date) {
  const breakdownBySaleId: Record<
    string,
    {
      statusLabel: string;
      paidAmount: number;
      dueAmount: number;
    }
  > = {};

  const allSales = await getSales(userId);
  const customerIds = Array.from(new Set(salesToResolve.map((sale) => sale.customerId)));

  const customerTransactionsMap = new Map(
    await Promise.all(
      customerIds.map(async (customerId) => {
        const transactions = await getTransactionsForCustomer(userId, customerId, 'Receivable');
        return [customerId, transactions] as const;
      })
    )
  );

  const formatMoney = (amount: number) => amount.toFixed(2);

  const buildSplitLabel = (cashAmount: number, bankAmount: number, dueAmount: number) => {
    const parts: string[] = [];
    if (cashAmount > 0) {
      parts.push(`${formatMoney(cashAmount)} Cash`);
    }
    if (bankAmount > 0) {
      parts.push(`${formatMoney(bankAmount)} Bank`);
    }
    if (dueAmount > 0) {
      parts.push(`${formatMoney(dueAmount)} Due`);
    }
    return `Split\n${parts.join('\n')}`;
  };

  for (const customerId of customerIds) {
    const customerSales = allSales
      .filter((sale) => sale.customerId === customerId && new Date(sale.date) <= reportEndDate)
      .filter((sale) => sale.paymentMethod === 'Due' || sale.paymentMethod === 'Split')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const ledger = customerSales.map((sale) => ({
      saleId: sale.id,
      originalDueAmount: getOriginalDueAmount(sale),
      remainingDueAmount: getOriginalDueAmount(sale),
      cashPaidAmount: sale.paymentMethod === 'Split' && sale.splitPaymentMethod === 'Cash' ? sale.amountPaid || 0 : 0,
      bankPaidAmount: sale.paymentMethod === 'Split' && sale.splitPaymentMethod === 'Bank' ? sale.amountPaid || 0 : 0,
    }));

    const customerPayments = (customerTransactionsMap.get(customerId) || [])
      .filter((transaction) => transaction.status === 'Paid')
      .filter((transaction) => transaction.description?.startsWith('Payment from customer'))
      .filter((transaction) => new Date(transaction.dueDate) <= reportEndDate)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    for (const payment of customerPayments) {
      let amountToAllocate = payment.amount;

      for (const saleLedger of ledger) {
        if (amountToAllocate <= 0) break;
        if (saleLedger.remainingDueAmount <= 0) continue;

        const allocatedAmount = Math.min(amountToAllocate, saleLedger.remainingDueAmount);
        saleLedger.remainingDueAmount -= allocatedAmount;

        if (payment.paymentMethod === 'Bank') {
          saleLedger.bankPaidAmount += allocatedAmount;
        } else {
          saleLedger.cashPaidAmount += allocatedAmount;
        }

        amountToAllocate -= allocatedAmount;
      }
    }

    for (const sale of salesToResolve.filter((entry) => entry.customerId === customerId)) {
      const total = sale.total;

      if (sale.paymentMethod === 'Cash') {
        breakdownBySaleId[sale.id] = { statusLabel: 'Cash', paidAmount: total, dueAmount: 0 };
        continue;
      }

      if (sale.paymentMethod === 'Bank') {
        breakdownBySaleId[sale.id] = { statusLabel: 'Bank', paidAmount: total, dueAmount: 0 };
        continue;
      }

      if (sale.paymentMethod === 'Paid by Credit') {
        breakdownBySaleId[sale.id] = { statusLabel: 'Credit', paidAmount: total, dueAmount: 0 };
        continue;
      }

      const saleLedger = ledger.find((entry) => entry.saleId === sale.id);

      if (!saleLedger) {
        breakdownBySaleId[sale.id] = {
          statusLabel: sale.paymentMethod === 'Split'
            ? buildSplitLabel(
                sale.splitPaymentMethod === 'Cash' ? sale.amountPaid || 0 : 0,
                sale.splitPaymentMethod === 'Bank' ? sale.amountPaid || 0 : 0,
                getOriginalDueAmount(sale)
              )
            : 'Due',
          paidAmount: sale.paymentMethod === 'Split' ? sale.amountPaid || 0 : 0,
          dueAmount: getOriginalDueAmount(sale),
        };
        continue;
      }

      const paidAmount = saleLedger.cashPaidAmount + saleLedger.bankPaidAmount;
      const dueAmount = saleLedger.remainingDueAmount;

      let statusLabel = 'Due';
      if (dueAmount <= 0) {
        if (saleLedger.cashPaidAmount > 0 && saleLedger.bankPaidAmount === 0) {
          statusLabel = 'Cash';
        } else if (saleLedger.bankPaidAmount > 0 && saleLedger.cashPaidAmount === 0) {
          statusLabel = 'Bank';
        } else {
          statusLabel = buildSplitLabel(saleLedger.cashPaidAmount, saleLedger.bankPaidAmount, 0);
        }
      } else if (sale.paymentMethod === 'Split') {
        statusLabel = buildSplitLabel(saleLedger.cashPaidAmount, saleLedger.bankPaidAmount, dueAmount);
      }

      breakdownBySaleId[sale.id] = {
        statusLabel,
        paidAmount,
        dueAmount,
      };
    }
  }

  return breakdownBySaleId;
}

export async function downloadSalesPdf(userId: string, dateRange: DateRange | undefined, authUser: any, items: Item[], customers: Customer[]) {
  const filteredSales = await getFilteredSales(userId, dateRange);
  if (!filteredSales || filteredSales.length === 0) {
    return false;
  }

  const exportBreakdown = await resolveExportBreakdownForSales(userId, filteredSales, dateRange!.to || dateRange!.from!);

  const doc = new jsPDF();
  const dateString = `${format(dateRange!.from!, 'PPP')} - ${format(dateRange!.to! || dateRange!.from!, 'PPP')}`;

  const getCustomerName = (customerId: string) => customers.find(c => c.id === customerId)?.name || 'Unknown Customer';
  const getItemTitle = (itemId: string) => items.find(i => i.id === itemId)?.title || 'Unknown Item';

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
  doc.text('Sales Report', 105, 45, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`For the period: ${dateString}`, 105, 51, { align: 'center' });
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 60,
    head: [['Date', 'Sale ID', 'Customer', 'Items', 'Discount', 'Status', 'Paid Amount', 'Due Amount', 'Total']],
    body: filteredSales.map(sale => [
      format(new Date(sale.date), 'yyyy-MM-dd'),
      sale.saleId,
      getCustomerName(sale.customerId),
      sale.items.map(i => `${i.quantity}x ${getItemTitle(i.itemId)}`).join(', '),
      sale.discountType === 'percentage' ? `${sale.discountValue}%` : `TK ${sale.discountValue.toFixed(2)}`,
      exportBreakdown[sale.id]?.statusLabel || sale.paymentMethod,
      `TK ${(exportBreakdown[sale.id]?.paidAmount ?? sale.total).toFixed(2)}`,
      `TK ${(exportBreakdown[sale.id]?.dueAmount ?? 0).toFixed(2)}`,
      `TK ${sale.total.toFixed(2)}`
    ]),
  });

  doc.save(`sales-report-${format(dateRange!.from!, 'yyyy-MM-dd')}-to-${format(dateRange!.to! || dateRange!.from!, 'yyyy-MM-dd')}.pdf`);
  return true;
}

export async function downloadSalesXlsx(userId: string, dateRange: DateRange | undefined, items: Item[], customers: Customer[]) {
  const filteredSales = await getFilteredSales(userId, dateRange);
  if (!filteredSales || filteredSales.length === 0) {
    return false;
  }

  const exportBreakdown = await resolveExportBreakdownForSales(userId, filteredSales, dateRange!.to || dateRange!.from!);
  const getCustomerName = (customerId: string) => customers.find(c => c.id === customerId)?.name || 'Unknown Customer';
  const getItemTitle = (itemId: string) => items.find(i => i.id === itemId)?.title || 'Unknown Item';

  const dataToExport = filteredSales.map(sale => ({
    'Date': format(new Date(sale.date), 'yyyy-MM-dd'),
    'Sale ID': sale.saleId,
    'Customer': getCustomerName(sale.customerId),
    'Items': sale.items.map(i => `${i.quantity}x ${getItemTitle(i.itemId)}`).join('; '),
    'Discount': sale.discountType === 'percentage' ? `${sale.discountValue}%` : sale.discountValue,
    'Status': exportBreakdown[sale.id]?.statusLabel || sale.paymentMethod,
    'Paid Amount': exportBreakdown[sale.id]?.paidAmount ?? sale.total,
    'Due Amount': exportBreakdown[sale.id]?.dueAmount ?? 0,
    'Total': sale.total,
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
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
  XLSX.writeFile(workbook, `sales-report-${format(dateRange!.from!, 'yyyy-MM-dd')}-to-${format(dateRange!.to! || dateRange!.from!, 'yyyy-MM-dd')}.xlsx`);
  return true;
}

export async function downloadSalesItemsPdf(userId: string, dateRange: DateRange | undefined, authUser: any, items: Item[]) {
  const filteredSales = await getFilteredSales(userId, dateRange);
  if (!filteredSales || filteredSales.length === 0) {
    return false;
  }

  const getItemTitle = (itemId: string) => items.find(i => i.id === itemId)?.title || 'Unknown Item';
  
  const summary: Record<string, { title: string; qty: number; revenue: number }> = {};
  for (const sale of filteredSales) {
    for (const saleItem of sale.items) {
      const title = getItemTitle(saleItem.itemId);
      if (!summary[saleItem.itemId]) {
        summary[saleItem.itemId] = { title, qty: 0, revenue: 0 };
      }
      summary[saleItem.itemId].qty += saleItem.quantity;
      summary[saleItem.itemId].revenue += saleItem.quantity * saleItem.price;
    }
  }
  const summaryRows = Object.values(summary).sort((a, b) => a.title.localeCompare(b.title));

  const dateString = `${format(dateRange!.from!, 'PPP')} - ${format(dateRange!.to! || dateRange!.from!, 'PPP')}`;
  const totalQty = summaryRows.reduce((acc, r) => acc + r.qty, 0);
  const totalRevenue = summaryRows.reduce((acc, r) => acc + r.revenue, 0);

  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(authUser.companyName || 'Bookstore', 14, 20);
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
  doc.text('Items Sold Summary', 105, 45, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`For the period: ${dateString}`, 105, 51, { align: 'center' });
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 60,
    head: [['#', 'Item / Book Title', 'Qty Sold', 'Total Revenue']],
    body: summaryRows.map((row, i) => [
      i + 1,
      row.title,
      row.qty,
      `BDT ${row.revenue.toFixed(2)}`,
    ]),
    foot: [['', 'TOTAL', totalQty, `BDT ${totalRevenue.toFixed(2)}`]],
    footStyles: { fontStyle: 'bold' },
  });

  doc.save(`items-sold-${format(dateRange!.from!, 'yyyy-MM-dd')}-to-${format(dateRange!.to! || dateRange!.from!, 'yyyy-MM-dd')}.pdf`);
  return true;
}

export async function downloadSalesItemsXlsx(userId: string, dateRange: DateRange | undefined, items: Item[]) {
  const filteredSales = await getFilteredSales(userId, dateRange);
  if (!filteredSales || filteredSales.length === 0) {
    return false;
  }

  const getItemTitle = (itemId: string) => items.find(i => i.id === itemId)?.title || 'Unknown Item';

  const summary: Record<string, { title: string; qty: number; revenue: number }> = {};
  for (const sale of filteredSales) {
    for (const saleItem of sale.items) {
      const title = getItemTitle(saleItem.itemId);
      if (!summary[saleItem.itemId]) {
        summary[saleItem.itemId] = { title, qty: 0, revenue: 0 };
      }
      summary[saleItem.itemId].qty += saleItem.quantity;
      summary[saleItem.itemId].revenue += saleItem.quantity * saleItem.price;
    }
  }
  const summaryRows = Object.values(summary).sort((a, b) => a.title.localeCompare(b.title));

  const dataToExport = summaryRows.map((row, i) => ({
    '#': i + 1,
    'Item / Book Title': row.title,
    'Qty Sold': row.qty,
    'Total Revenue (BDT)': row.revenue,
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const columnWidths = [{ wch: 5 }, { wch: 40 }, { wch: 12 }, { wch: 22 }];
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Items Sold');
  XLSX.writeFile(workbook, `items-sold-${format(dateRange!.from!, 'yyyy-MM-dd')}-to-${format(dateRange!.to! || dateRange!.from!, 'yyyy-MM-dd')}.xlsx`);
  return true;
}
