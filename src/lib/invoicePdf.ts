import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatIST } from './dateUtils';

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  enrollmentDate: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string | null;
  courseTitle: string;
  totalFees: number;
  paidAmount: number;
  dueAmount: number;
  payments: Array<{
    paid_on: string;
    amount: number;
    payment_method: string;
    reference_no?: string | null;
  }>;
}

const BRAND = 'Prepnow';
const BRAND_SUB = 'Learning Management System';

const inr = (n: number) =>
  `INR ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function header(doc: jsPDF, title: string) {
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(BRAND, 14, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(BRAND_SUB, 14, 21);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 196, 18, { align: 'right' });
  doc.setTextColor(20, 20, 20);
}

function footer(doc: jsPDF) {
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220, 220, 220);
  doc.line(14, h - 18, 196, h - 18);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('This is a system-generated document and does not require a signature.', 105, h - 12, {
    align: 'center',
  });
  doc.text(`Generated on ${formatIST(new Date(), 'dd MMM yyyy, hh:mm a')} IST`, 105, h - 7, {
    align: 'center',
  });
}

export function downloadInvoice(d: InvoicePdfData) {
  const doc = new jsPDF();
  header(doc, 'TAX INVOICE');

  // Meta
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice #', 14, 40);
  doc.text('Invoice Date', 14, 46);
  doc.text('Enrollment Date', 14, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(d.invoiceNumber, 50, 40);
  doc.text(formatIST(d.invoiceDate, 'dd MMM yyyy'), 50, 46);
  doc.text(formatIST(d.enrollmentDate, 'dd MMM yyyy'), 50, 52);

  // Billed To
  doc.setFont('helvetica', 'bold');
  doc.text('Billed To', 120, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(d.studentName || '—', 120, 46);
  doc.text(d.studentEmail || '', 120, 52);
  if (d.studentPhone) doc.text(d.studentPhone, 120, 58);

  // Items
  autoTable(doc, {
    startY: 70,
    head: [['#', 'Description', 'Amount']],
    body: [['1', d.courseTitle, inr(d.totalFees)]],
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: { 0: { cellWidth: 12 }, 2: { halign: 'right', cellWidth: 40 } },
  });

  // Totals
  const y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'normal');
  doc.text('Total Fees', 140, y);
  doc.text(inr(d.totalFees), 196, y, { align: 'right' });
  doc.text('Paid', 140, y + 6);
  doc.text(inr(d.paidAmount), 196, y + 6, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text('Amount Due', 140, y + 14);
  doc.text(inr(d.dueAmount), 196, y + 14, { align: 'right' });

  // Payment history
  if (d.payments.length) {
    autoTable(doc, {
      startY: y + 24,
      head: [['Date', 'Method', 'Reference', 'Amount']],
      body: d.payments.map((p) => [
        formatIST(p.paid_on, 'dd MMM yyyy'),
        p.payment_method,
        p.reference_no || '—',
        inr(p.amount),
      ]),
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: { 3: { halign: 'right' } },
    });
  }

  footer(doc);
  doc.save(`${d.invoiceNumber}.pdf`);
}

export function downloadReceipt(
  d: InvoicePdfData,
  payment: InvoicePdfData['payments'][number]
) {
  const doc = new jsPDF();
  header(doc, 'PAYMENT RECEIPT');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt for Invoice', 14, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(d.invoiceNumber, 60, 40);

  doc.setFont('helvetica', 'bold');
  doc.text('Received From', 14, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(d.studentName, 50, 50);
  doc.text(d.studentEmail, 50, 56);

  autoTable(doc, {
    startY: 70,
    head: [['Date', 'Method', 'Reference', 'Amount']],
    body: [
      [
        formatIST(payment.paid_on, 'dd MMM yyyy, hh:mm a'),
        payment.payment_method,
        payment.reference_no || '—',
        inr(payment.amount),
      ],
    ],
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    columnStyles: { 3: { halign: 'right' } },
  });

  const y = (doc as any).lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Amount Received: ${inr(payment.amount)}`, 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total Fees: ${inr(d.totalFees)}`, 14, y + 8);
  doc.text(`Paid till date: ${inr(d.paidAmount)}`, 14, y + 14);
  doc.text(`Balance Due: ${inr(d.dueAmount)}`, 14, y + 20);

  footer(doc);
  doc.save(`Receipt-${d.invoiceNumber}.pdf`);
}
