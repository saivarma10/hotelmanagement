import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutletAccessService } from '../common/outlet-access.service';
import { AuthUser } from '../common/auth.guard';
import { startOfDay, endOfDay, toNumber } from '../common/money.util';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private outletAccess: OutletAccessService,
  ) {}

  async daySummary(outletId: string, user: AuthUser, dateStr?: string) {
    await this.outletAccess.verifyOutletAccess(outletId, user);

    const date = dateStr ? new Date(dateStr) : new Date();
    const from = startOfDay(date);
    const to = endOfDay(date);

    const bills = await this.prisma.bill.findMany({
      where: { outletId, createdAt: { gte: from, lte: to } },
      include: {
        payments: true,
        order: {
          include: {
            items: {
              include: { menuItem: true },
            },
          },
        },
      },
    });

    const totalSales = bills.reduce((s, b) => s + toNumber(b.total), 0);
    const totalTax = bills.reduce((s, b) => s + toNumber(b.taxAmount), 0);
    const totalDiscount = bills.reduce((s, b) => s + toNumber(b.discountAmount), 0);
    const billCount = bills.length;

    const paymentBreakdown: Record<string, number> = {};
    for (const bill of bills) {
      for (const payment of bill.payments) {
        paymentBreakdown[payment.method] =
          (paymentBreakdown[payment.method] ?? 0) + toNumber(payment.amount);
      }
    }

    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const bill of bills) {
      for (const item of bill.order.items) {
        const key = item.menuItemId;
        const existing = itemMap.get(key) ?? {
          name: item.menuItem.name,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += toNumber(item.unitPrice) * item.quantity;
        itemMap.set(key, existing);
      }
    }

    const itemWise = Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue);

    const orders = await this.prisma.order.count({
      where: { outletId, createdAt: { gte: from, lte: to } },
    });

    const cancelled = await this.prisma.order.count({
      where: { outletId, status: 'CANCELLED', createdAt: { gte: from, lte: to } },
    });

    return {
      date: from.toISOString().split('T')[0],
      billCount,
      orderCount: orders,
      cancelledOrders: cancelled,
      totalSales: Math.round(totalSales * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      paymentBreakdown,
      itemWise,
    };
  }
}
