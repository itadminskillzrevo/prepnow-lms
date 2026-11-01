import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface SpInvoiceData {
  invoiceNumber: string;
  date: string | Date;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  amount: number;
  currency?: string;
  status?: string;
  orderNumber?: string;
  paymentMethod?: string;
}

const fmt = (n: number, cur = 'INR') =>
  `${cur} ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function buildSpInvoiceDoc(d: SpInvoiceData) {
  const doc = new jsPDF();
  // header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('SkillzRevo', 14, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Self-Paced Learning', 14, 21);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('INVOICE', 196, 18, { align: 'right' });

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);

  const dt = new Date(d.date);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice #', 14, 40);
  doc.text('Date', 14, 46);
  if (d.orderNumber) doc.text('Order #', 14, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(d.invoiceNumber, 50, 40);
  doc.text(dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 50, 46);
  if (d.orderNumber) doc.text(d.orderNumber, 50, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('Billed To', 120, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(d.studentName || '—', 120, 46);
  doc.text(d.studentEmail || '', 120, 52);

  autoTable(doc, {
    startY: 72,
    head: [['#', 'Description', 'Amount']],
    body: [['1', d.courseTitle, d.amount === 0 ? 'FREE' : fmt(d.amount, d.currency)]],
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: { 0: { cellWidth: 12 }, 2: { halign: 'right', cellWidth: 45 } },
  });

  const y = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Total', 140, y);
  doc.text(d.amount === 0 ? 'FREE' : fmt(d.amount, d.currency), 196, y, { align: 'right' });
  if (d.status) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${d.status.toUpperCase()}`, 14, y);
  }
  if (d.paymentMethod) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment: ${d.paymentMethod}`, 14, y + 6);
  }

  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220, 220, 220);
  doc.line(14, h - 18, 196, h - 18);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('This is a system-generated invoice.', 105, h - 12, { align: 'center' });
  doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, 105, h - 7, { align: 'center' });

  return doc;
}

export function downloadSpInvoice(d: SpInvoiceData) {
  const doc = buildSpInvoiceDoc(d);
  doc.save(`${d.invoiceNumber}.pdf`);
}

export function previewSpInvoice(d: SpInvoiceData): string {
  const doc = buildSpInvoiceDoc(d);
  return doc.output('bloburl') as unknown as string;
}
