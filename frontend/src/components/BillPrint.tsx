import type { Bill } from '../types';
import { formatMoney, formatDate, formatTime } from '../utils';

export function printBill(bill: Bill) {
  const html = `
    <html><head><title>Bill ${bill.billNumber}</title>
    <style>
      body{font-family:monospace;font-size:12px;width:80mm;margin:0;padding:8px}
      .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:8px 0}
      .row{display:flex;justify-content:space-between}
    </style></head><body>
    <div class="center bold" style="font-size:14px">${bill.outletName}</div>
    ${bill.gstNumber ? `<div class="center" style="font-size:10px">GSTIN: ${bill.gstNumber}</div>` : ''}
    <div class="line"></div>
    <div class="center bold">TAX INVOICE</div>
    <div>Bill #${bill.billNumber}</div>
    ${bill.orderNumber ? `<div>Order #${bill.orderNumber}</div>` : ''}
    ${bill.table ? `<div>Table: ${bill.table}${bill.area ? ` (${bill.area})` : ''}</div>` : ''}
    ${bill.cashier ? `<div>Cashier: ${bill.cashier}</div>` : ''}
    <div>Date: ${formatDate(bill.createdAt)} ${formatTime(bill.createdAt)}</div>
    <div class="line"></div>
    ${(bill.items ?? [])
      .map(
        (item) => `
      <div style="margin-bottom:6px">
        <div class="row">
          <span>${item.quantity}x ${item.name}${item.variation ? ` (${item.variation})` : ''}</span>
          <span>${formatMoney(item.lineTotal)}</span>
        </div>
      </div>`,
      )
      .join('')}
    <div class="line"></div>
    <div class="row"><span>Subtotal</span><span>${formatMoney(bill.subtotal)}</span></div>
    ${bill.discountAmount > 0 ? `<div class="row"><span>Discount</span><span>-${formatMoney(bill.discountAmount)}</span></div>` : ''}
    <div class="row"><span>GST (${bill.taxRate}%)</span><span>${formatMoney(bill.taxAmount)}</span></div>
    <div class="row bold" style="font-size:14px;margin-top:4px"><span>TOTAL</span><span>${formatMoney(bill.total)}</span></div>
    <div class="line"></div>
    ${bill.payments.map((p) => `<div class="row"><span>${p.method}</span><span>${formatMoney(p.amount)}</span></div>`).join('')}
    <div class="line"></div>
    <div class="center" style="font-size:10px">Thank you! Visit again.</div>
    </body></html>`;

  const win = window.open('', '_blank', 'width=320,height=600');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}
