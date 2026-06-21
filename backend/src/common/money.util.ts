import { Decimal } from '@prisma/client/runtime/library';

export function toNumber(value: Decimal | number | string): number {
  return Number(value);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateBillTotals(
  items: { quantity: number; unitPrice: number; addons: { price: number }[] }[],
  taxRate: number,
  discountPercent: number,
  discountAmount: number,
) {
  const subtotal = roundMoney(
    items.reduce((sum, item) => {
      const addonTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
      return sum + (item.unitPrice + addonTotal) * item.quantity;
    }, 0),
  );

  const percentDiscount = roundMoney(subtotal * (discountPercent / 100));
  const totalDiscount = roundMoney(percentDiscount + discountAmount);
  const taxable = roundMoney(Math.max(subtotal - totalDiscount, 0));
  const taxAmount = roundMoney(taxable * (taxRate / 100));
  const total = roundMoney(taxable + taxAmount);

  return { subtotal, discountAmount: totalDiscount, taxAmount, total };
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
