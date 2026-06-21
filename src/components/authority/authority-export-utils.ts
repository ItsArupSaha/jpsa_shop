import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AuthorityPresentationReport as AuthorityReportData } from '@/lib/db/authority-presentation-report';

const formatCurrencyForPdf = (amount: number) =>
  `BDT ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;

function truncatePdfCell(text: string, maxLen: number): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

type OverviewPdf = AuthorityReportData['opening'];

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

  let yPos = 20;
  if (authUser.bkashNumber) {
    doc.text(`Bkash: ${authUser.bkashNumber}`, 200, yPos, { align: 'right' });
    yPos += 6;
  }
  if (authUser.bankInfo) {
    doc.text(`Bank: ${authUser.bankInfo}`, 200, yPos, { align: 'right' });
  }
}

function appendBalanceSheetSection(
  doc: jsPDF,
  title: string,
  asOfLabel: string,
  overview: OverviewPdf,
  startY: number
): number {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(48, 103, 84);
  doc.text(title, 14, startY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(asOfLabel, 14, startY + 5);
  doc.setTextColor(0);

  const assetsBody: (string | { content: string; styles?: { fontStyle: string } })[][] = [
    ['Cash', formatCurrencyForPdf(overview.cash)],
    ['Bank', formatCurrencyForPdf(overview.bank)],
    ['Customer Dues (Receivables)', formatCurrencyForPdf(overview.receivables)],
    ['Stock Value', formatCurrencyForPdf(overview.stockValue)],
    ['Office Assets', formatCurrencyForPdf(overview.officeAssetsValue)],
  ];

  autoTable(doc, {
    startY: startY + 10,
    head: [['Assets & Dues', 'Amount']],
    body: assetsBody as string[][],
    foot: [
      [
        { content: 'Total Assets', styles: { fontStyle: 'bold' } },
        { content: formatCurrencyForPdf(overview.totalAssets), styles: { fontStyle: 'bold' } },
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor: '#306754', fontStyle: 'bold' },
    footStyles: { fillColor: '#F5F5DC', textColor: '#000000', fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
  });

  let y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY + 80) + 12;

  if (y > 230) {
    doc.addPage();
    y = 24;
  }

  const liabilitiesBody = [
    ['Payables', formatCurrencyForPdf(overview.payables)],
    [
      { content: 'Total Liabilities', styles: { fontStyle: 'bold' as const } },
      { content: formatCurrencyForPdf(overview.payables), styles: { fontStyle: 'bold' as const } },
    ],
    ['', ''],
    [
      { content: "Owner's Equity / Net Worth", styles: { fontStyle: 'bold' as const } },
      { content: formatCurrencyForPdf(overview.equity), styles: { fontStyle: 'bold' as const } },
    ],
  ] as any;

  autoTable(doc, {
    startY: y,
    head: [['Liabilities & Equity', 'Amount']],
    body: liabilitiesBody,
    theme: 'striped',
    headStyles: { fillColor: '#306754', fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
  });

  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function nextSectionStart(doc: jsPDF, lastFinalY: number, gap = 16): number {
  const next = lastFinalY + gap;
  if (next > 248) {
    doc.addPage();
    return 22;
  }
  return next;
}

export function exportAuthorityReportPdf(
  report: AuthorityReportData,
  startDate: Date,
  endDate: Date,
  authUser: AuthUserProps
) {
  const doc = new jsPDF();
  drawCompanyHeader(doc, authUser);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Authority Presentation Report', 105, 48, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Period: ${format(startDate, 'PP')} – ${format(endDate, 'PP')}`, 105, 55, {
    align: 'center',
  });
  doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 105, 61, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  let y = appendBalanceSheetSection(
    doc,
    '1. Opening balance sheet',
    `As of ${format(startDate, 'PPP')} (end of day)`,
    report.opening,
    68
  );

  y = nextSectionStart(doc, y, 18);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(48, 103, 84);
  doc.text('2. Income and expense by period', 14, y);
  doc.setTextColor(0, 0, 0);

  const periodBody = report.periods.map((row) => [
    `${row.label}\n(${row.fromYmd} → ${row.toYmd})`,
    formatCurrencyForPdf(row.income),
    formatCurrencyForPdf(row.expense),
    formatCurrencyForPdf(row.net),
  ]);

  autoTable(doc, {
    startY: y + 6,
    head: [['Period', 'Income (sales)', 'Expense', 'Net']],
    body: periodBody,
    theme: 'striped',
    headStyles: { fillColor: '#306754', fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 72 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  let lastTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  y = nextSectionStart(doc, lastTableY, 18);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(48, 103, 84);
  doc.text('3. Purchases (books and items)', 14, y);
  doc.setTextColor(0, 0, 0);

  if (report.purchases.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No purchases in this date range.', 14, y + 7);
    lastTableY = y + 14;
  } else {
    const purchaseBody = report.purchases.map((p) => [
      p.purchaseId,
      format(new Date(p.date), 'yyyy-MM-dd'),
      truncatePdfCell(p.supplier, 22),
      truncatePdfCell(p.itemSummary, 48),
      formatCurrencyForPdf(p.totalAmount),
    ]);
    autoTable(doc, {
      startY: y + 6,
      head: [['ID', 'Date', 'Supplier', 'Items (summary)', 'Total']],
      body: purchaseBody,
      theme: 'striped',
      headStyles: { fillColor: '#306754', fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 24, font: 'courier', fontStyle: 'normal' },
        1: { cellWidth: 24 },
        2: { cellWidth: 28 },
        3: { cellWidth: 62 },
        4: { halign: 'right', cellWidth: 32 },
      },
      styles: { fontSize: 7, cellPadding: 1.5 },
    });
    lastTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  y = nextSectionStart(doc, lastTableY, 18);
  y = appendBalanceSheetSection(
    doc,
    '4. Closing balance sheet',
    `As of ${format(endDate, 'PPP')} (end of day)`,
    report.closing,
    y
  );

  y = nextSectionStart(doc, y, 18);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(48, 103, 84);
  doc.text("5. Change in Owner's Equity / Net Worth", 14, y);
  doc.setTextColor(0, 0, 0);

  const equityBody = [
    ['Equity at start of period', formatCurrencyForPdf(report.equityStart)],
    ['Equity at end of period', formatCurrencyForPdf(report.equityEnd)],
    [
      {
        content: 'Net change (profit if positive, loss if negative)',
        styles: { fontStyle: 'bold' as const },
      },
      {
        content: formatCurrencyForPdf(report.equityDelta),
        styles: { fontStyle: 'bold' as const },
      },
    ],
  ] as any;

  autoTable(doc, {
    startY: y + 6,
    head: [['Summary', 'Amount']],
    body: equityBody,
    theme: 'striped',
    headStyles: { fillColor: '#306754', fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
  });

  const fileName = `authority-presentation-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
