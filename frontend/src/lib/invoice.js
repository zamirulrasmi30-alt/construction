import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const money = (n) =>
  'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const qty = (n) => {
  const v = Number(n || 0);
  return v % 1 === 0 ? v.toLocaleString('en-IN') : v.toLocaleString('en-IN', { maximumFractionDigits: 3 });
};

const date = (iso) => {
  const d = new Date(iso || Date.now());
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function downloadInvoicePdf(order, docTitle = 'INVOICE') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const M = 40;
  const green = [20, 83, 45];
  const slate = [71, 85, 105];

  doc.setFillColor(...green);
  doc.rect(0, 0, pageW, 86, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('BuildSupply ERP', M, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(214, 226, 214);
  doc.text('Construction Materials · E-Commerce & ERP', M, 58);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(String(docTitle || 'INVOICE'), pageW - M, 42, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`Invoice No: ${order.order_number || '—'}`, pageW - M, 62, { align: 'right' });
  doc.text(`Date: ${date(order.created_at)}`, pageW - M, 76, { align: 'right' });

  let y = 112;
  doc.setTextColor(...slate);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BILLED TO', M, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(31, 41, 55);
  doc.text(String(order.customer_name || 'Customer'), M, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...slate);
  const lines = [
    order.customer_email ? `Email   : ${order.customer_email}` : null,
    `Phone   : ${order.customer_phone || '—'}`,
    `Address : ${order.delivery_address || '—'}${order.landmark ? `, ${order.landmark}` : ''}${order.pincode ? ` — ${order.pincode}` : ''}`,
  ].filter(Boolean);
  lines.forEach((l, i) => doc.text(l, M, y + 36 + i * 14));

  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const startY = y + 36 + lines.length * 14 + 20;

  autoTable(doc, {
    startY,
    margin: { left: M, right: M },
    head: [['#', 'Item', 'Qty', 'Unit Price', 'Total']],
    body: items.map((it, i) => [
      String(i + 1),
      `${it.product_name || '—'}${it.brand ? ` (${it.brand})` : ''}`,
      `${qty(it.quantity)} ${it.unit_type || ''}`.trim(),
      money(it.unit_price_effective),
      money(it.subtotal),
    ]),
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, textColor: [31, 41, 55] },
    headStyles: { fillColor: green, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 248, 245] },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
  });

  const tableEnd = doc.lastAutoTable.finalY || startY;
  let sy = tableEnd + 18;
  const colRight = pageW - M;
  const rowH = 16;

  const summary = [
    ['Item Subtotal', money(order.item_subtotal)],
    ...(Number(order.discount_amount) > 0 ? [['Bulk Discount', '− ' + money(order.discount_amount)]] : []),
    ...(Number(order.gst_amount) > 0 ? [[`GST @ ${order.gst_rate ?? 18}%`, money(order.gst_amount)]] : []),
    ['Freight', money(order.freight_charge)],
  ];

  doc.setFontSize(10);
  doc.setTextColor(...slate);
  summary.forEach(([label, value]) => {
    doc.text(label, M, sy);
    doc.text(value, colRight, sy, { align: 'right' });
    sy += rowH;
  });

  sy += 4;
  doc.setDrawColor(...green);
  doc.setLineWidth(1.2);
  doc.line(M, sy - 8, colRight, sy - 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...green);
  doc.text('Grand Total', M, sy);
  doc.text(money(order.total_amount), colRight, sy, { align: 'right' });

  sy += 26;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.6);
  doc.line(M, sy, colRight, sy);

  sy += 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  doc.text(`Payment Status: ${String(order.payment_status || '').replace(/_/g, ' ')}`, M, sy);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...slate);
  doc.text(`Advance paid: ${money(order.advance_paid)} · Balance on delivery: ${money(order.balance_due)}`, M, sy + 14);
  doc.text('Thank you for your business with BuildSupply ERP.', M, sy + 42);

  const baseName = docTitle
    ? docTitle.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()).replace(/\s+/g, '')
    : 'Invoice';
  doc.save(`${baseName}_${order.order_number || 'order'}.pdf`);
}