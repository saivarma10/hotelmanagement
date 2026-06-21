import type { KotPrintData } from '../types';
import { formatTime } from '../utils';

export default function KotPrint({ kot }: { kot: KotPrintData }) {
  return (
    <div className="print-area hidden">
      <div className="p-2 font-mono text-sm">
        <div className="text-center font-bold text-base">KITCHEN ORDER</div>
        <div className="text-center">KOT #{kot.kotNumber}</div>
        <div className="border-t border-dashed my-2" />
        <div>Table: {kot.table} ({kot.area})</div>
        <div>Order #{kot.orderNumber}</div>
        <div>Time: {formatTime(kot.createdAt)}</div>
        <div className="border-t border-dashed my-2" />
        {kot.items.map((item, i) => (
          <div key={i} className="mb-2">
            <div className="font-bold">
              {item.quantity}x {item.name}
              {item.variation ? ` (${item.variation})` : ''}
            </div>
            {item.addons.length > 0 && (
              <div className="text-xs pl-2">+ {item.addons.join(', ')}</div>
            )}
            {item.notes && <div className="text-xs pl-2 italic">Note: {item.notes}</div>}
          </div>
        ))}
        <div className="border-t border-dashed my-2" />
        <div className="text-center text-xs">--- END KOT ---</div>
      </div>
    </div>
  );
}

export function printKot(kot: KotPrintData) {
  const html = `
    <html><head><title>KOT ${kot.kotNumber}</title>
    <style>body{font-family:monospace;font-size:12px;width:80mm;margin:0;padding:8px}
    .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:8px 0}</style></head><body>
    <div class="center bold" style="font-size:14px">KITCHEN ORDER</div>
    <div class="center">KOT #${kot.kotNumber}</div>
    <div class="line"></div>
    <div>Table: ${kot.table} (${kot.area})</div>
    <div>Order #${kot.orderNumber}</div>
    <div>Time: ${formatTime(kot.createdAt)}</div>
    <div class="line"></div>
    ${kot.items
      .map(
        (item) => `
      <div style="margin-bottom:8px">
        <div class="bold">${item.quantity}x ${item.name}${item.variation ? ` (${item.variation})` : ''}</div>
        ${item.addons.length ? `<div style="padding-left:8px;font-size:11px">+ ${item.addons.join(', ')}</div>` : ''}
        ${item.notes ? `<div style="padding-left:8px;font-size:11px;font-style:italic">Note: ${item.notes}</div>` : ''}
      </div>`,
      )
      .join('')}
    <div class="line"></div>
    <div class="center" style="font-size:10px">--- END KOT ---</div>
    </body></html>`;

  const win = window.open('', '_blank', 'width=320,height=600');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}
