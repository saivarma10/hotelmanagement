import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutletAccessService } from '../common/outlet-access.service';
import { CounterService } from '../common/counter.service';
import { AuthUser } from '../common/auth.guard';
import {
  CreateBillDto,
  SettleBillDto,
  SplitBillSettleDto,
  ListBillsQueryDto,
} from './billing.dto';
import { calculateBillTotals, roundMoney, toNumber, startOfDay, endOfDay } from '../common/money.util';

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private outletAccess: OutletAccessService,
    private counter: CounterService,
  ) {}

  private billableItems<T extends { status: string }>(items: T[]): T[] {
    return items.filter((i) => i.status !== 'CANCELLED');
  }

  async previewBill(orderId: string, user: AuthUser, dto: CreateBillDto = {}) {
    const { order, outlet } = await this.loadOrder(orderId, user);
    const billItems = this.billableItems(order.items);
    if (!billItems.length) {
      throw new BadRequestException('No billable items on this order');
    }
    const items = this.mapBillItems(billItems);

    const totals = calculateBillTotals(
      items,
      toNumber(outlet.gstRate),
      dto.discountPercent ?? 0,
      dto.discountAmount ?? 0,
    );

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      table: order.table.name,
      items: billItems.map((item) => ({
        id: item.id,
        name: item.menuItem.name,
        variation: item.variation?.name,
        quantity: item.quantity,
        unitPrice: toNumber(item.unitPrice),
        addons: item.addons.map((a) => ({ name: a.addon.name, price: toNumber(a.price) })),
        lineTotal: this.itemLineTotal(item),
      })),
      ...totals,
      taxRate: toNumber(outlet.gstRate),
      gstNumber: outlet.gstNumber,
    };
  }

  async settleBill(orderId: string, user: AuthUser, dto: SettleBillDto, billDto: CreateBillDto = {}) {
    const { order, outlet } = await this.loadOrder(orderId, user);

    if (order.status === 'BILLED') {
      throw new BadRequestException('Order already billed');
    }
    if (!order.items.some((i) => i.status !== 'CANCELLED')) {
      throw new BadRequestException('Order has no billable items');
    }

    const billItems = this.billableItems(order.items);
    const items = this.mapBillItems(billItems);
    const totals = calculateBillTotals(
      items,
      toNumber(outlet.gstRate),
      billDto.discountPercent ?? 0,
      billDto.discountAmount ?? 0,
    );

    const paymentTotal = roundMoney(dto.payments.reduce((s, p) => s + p.amount, 0));
    if (paymentTotal < totals.total) {
      throw new BadRequestException(`Payment short by ₹${roundMoney(totals.total - paymentTotal)}`);
    }

    const billNumber = await this.counter.nextBillNumber(order.outletId);

    const bill = await this.prisma.$transaction(async (tx) => {
      const created = await tx.bill.create({
        data: {
          billNumber,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          discountPercent: billDto.discountPercent ?? 0,
          taxAmount: totals.taxAmount,
          taxRate: toNumber(outlet.gstRate),
          total: totals.total,
          orderId: order.id,
          outletId: order.outletId,
          createdById: user.id,
          payments: {
            create: dto.payments.map((p) => ({
              method: p.method,
              amount: p.amount,
              reference: p.reference,
            })),
          },
          lineItems: {
            create: this.buildLineItemSnapshots(billItems),
          },
        },
        include: {
          payments: true,
          lineItems: { orderBy: { sortOrder: 'asc' } },
          order: { include: { table: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'BILLED' },
      });

      await tx.table.update({
        where: { id: order.tableId },
        data: { status: 'VACANT' },
      });

      return created;
    });

    return this.formatBill(bill, outlet);
  }

  async splitAndSettle(orderId: string, user: AuthUser, dto: SplitBillSettleDto) {
    const { order, outlet } = await this.loadOrder(orderId, user);

    if (order.status === 'BILLED') {
      throw new BadRequestException('Order already billed');
    }

    const allItemIds = order.items.map((i) => i.id);
    const assigned = dto.groups.flatMap((g) => g.orderItemIds);
    const missing = allItemIds.filter((id) => !assigned.includes(id));
    if (missing.length) {
      throw new BadRequestException('All order items must be assigned to a split group');
    }

    const bills = [];
    for (const group of dto.groups) {
      const groupItems = order.items.filter((i) => group.orderItemIds.includes(i.id));
      const items = this.mapBillItems(groupItems);
      const totals = calculateBillTotals(
        items,
        toNumber(outlet.gstRate),
        group.discountPercent ?? 0,
        group.discountAmount ?? 0,
      );

      const paymentTotal = roundMoney(group.payments.reduce((s, p) => s + p.amount, 0));
      if (paymentTotal < totals.total) {
        throw new BadRequestException('Split payment insufficient for one group');
      }

      const billNumber = await this.counter.nextBillNumber(order.outletId);

      const bill = await this.prisma.bill.create({
        data: {
          billNumber,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          discountPercent: group.discountPercent ?? 0,
          taxAmount: totals.taxAmount,
          taxRate: toNumber(outlet.gstRate),
          total: totals.total,
          orderId: order.id,
          outletId: order.outletId,
          createdById: user.id,
          payments: {
            create: group.payments.map((p) => ({
              method: p.method,
              amount: p.amount,
              reference: p.reference,
            })),
          },
          lineItems: {
            create: this.buildLineItemSnapshots(groupItems),
          },
        },
        include: { payments: true, lineItems: true },
      });

      bills.push(this.formatBill(bill, outlet));
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'BILLED' },
      }),
      this.prisma.table.update({
        where: { id: order.tableId },
        data: { status: 'VACANT' },
      }),
    ]);

    return { bills };
  }

  async getBill(billId: string, user: AuthUser) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      include: {
        payments: true,
        lineItems: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true } },
        order: {
          include: {
            table: { include: { area: true } },
            items: {
              include: {
                menuItem: true,
                variation: true,
                addons: { include: { addon: true } },
              },
            },
          },
        },
      },
    });

    if (!bill) throw new NotFoundException('Bill not found');
    await this.outletAccess.verifyOutletAccess(bill.outletId, user);

    const outlet = await this.prisma.outlet.findUnique({ where: { id: bill.outletId } });
    return this.formatBillDetail(bill, outlet!);
  }

  async listBills(outletId: string, user: AuthUser, query: ListBillsQueryDto) {
    await this.outletAccess.verifyOutletAccess(outletId, user);

    const { from, to } = this.resolveDateRange(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where = this.buildBillListWhere(outletId, from, to, query);

    const [bills, total, summary] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          payments: true,
          createdBy: { select: { id: true, name: true } },
          order: { include: { table: { include: { area: true } } } },
        },
      }),
      this.prisma.bill.count({ where }),
      this.prisma.bill.findMany({
        where: { outletId, createdAt: { gte: from, lte: to } },
        include: { payments: true },
      }),
    ]);

    const outlet = await this.prisma.outlet.findUnique({ where: { id: outletId } });

    return {
      bills: bills.map((b) => this.formatBillListItem(b, outlet!)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: this.computePeriodSummary(summary),
      filters: {
        dateFrom: from.toISOString().split('T')[0],
        dateTo: to.toISOString().split('T')[0],
        paymentMethod: query.paymentMethod ?? null,
        search: query.search ?? null,
      },
    };
  }

  async getDayEndSummary(outletId: string, user: AuthUser, dateStr?: string) {
    await this.outletAccess.verifyOutletAccess(outletId, user);

    const date = dateStr ? new Date(dateStr) : new Date();
    const from = startOfDay(date);
    const to = endOfDay(date);

    const bills = await this.prisma.bill.findMany({
      where: { outletId, createdAt: { gte: from, lte: to } },
      include: {
        payments: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    const billerMap = new Map<
      string,
      { name: string; billCount: number; totalSales: number; payments: Record<string, number> }
    >();

    for (const bill of bills) {
      const key = bill.createdById;
      const entry = billerMap.get(key) ?? {
        name: bill.createdBy.name,
        billCount: 0,
        totalSales: 0,
        payments: {} as Record<string, number>,
      };
      entry.billCount += 1;
      entry.totalSales += toNumber(bill.total);
      for (const p of bill.payments) {
        entry.payments[p.method] = (entry.payments[p.method] ?? 0) + toNumber(p.amount);
      }
      billerMap.set(key, entry);
    }

    const summary = this.computePeriodSummary(bills);

    return {
      date: from.toISOString().split('T')[0],
      ...summary,
      billerWise: Array.from(billerMap.values()).map((b) => ({
        ...b,
        totalSales: roundMoney(b.totalSales),
        payments: Object.fromEntries(
          Object.entries(b.payments).map(([k, v]) => [k, roundMoney(v)]),
        ),
      })),
    };
  }

  private buildLineItemSnapshots(
    items: Array<{
      menuItem: { name: string };
      variation: { name: string } | null;
      quantity: number;
      unitPrice: { toString: () => string };
      addons: Array<{ addon: { name: string }; price: { toString: () => string } }>;
    }>,
  ) {
    return items.map((item, index) => ({
      name: item.menuItem.name,
      variation: item.variation?.name ?? null,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice as never),
      lineTotal: this.itemLineTotal(item),
      addons: JSON.stringify(
        item.addons.map((a) => ({ name: a.addon.name, price: toNumber(a.price as never) })),
      ),
      sortOrder: index,
    }));
  }

  private parseAddonsJson(addons: string | null): Array<{ name: string; price: number }> {
    if (!addons) return [];
    try {
      return JSON.parse(addons) as Array<{ name: string; price: number }>;
    } catch {
      return [];
    }
  }

  private resolveDateRange(query: ListBillsQueryDto) {
    if (query.date) {
      const d = new Date(query.date);
      return { from: startOfDay(d), to: endOfDay(d) };
    }
    const from = query.dateFrom ? startOfDay(new Date(query.dateFrom)) : startOfDay(new Date());
    const to = query.dateTo ? endOfDay(new Date(query.dateTo)) : endOfDay(new Date());
    return { from, to };
  }

  private buildBillListWhere(
    outletId: string,
    from: Date,
    to: Date,
    query: ListBillsQueryDto,
  ) {
    const where: Record<string, unknown> = {
      outletId,
      createdAt: { gte: from, lte: to },
    };

    if (query.paymentMethod) {
      where.payments = { some: { method: query.paymentMethod } };
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      const billNum = parseInt(term, 10);
      const orConditions: object[] = [
        { order: { table: { name: { contains: term, mode: 'insensitive' } } } },
      ];
      if (!Number.isNaN(billNum)) {
        orConditions.push({ billNumber: billNum });
        orConditions.push({ order: { orderNumber: billNum } });
      }
      where.OR = orConditions;
    }

    return where;
  }

  private computePeriodSummary(
    bills: Array<{
      total: { toString: () => string };
      taxAmount: { toString: () => string };
      discountAmount: { toString: () => string };
      payments: Array<{ method: string; amount: { toString: () => string } }>;
    }>,
  ) {
    const paymentBreakdown: Record<string, number> = {};
    let totalSales = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    for (const bill of bills) {
      totalSales += toNumber(bill.total as never);
      totalTax += toNumber(bill.taxAmount as never);
      totalDiscount += toNumber(bill.discountAmount as never);
      for (const p of bill.payments) {
        paymentBreakdown[p.method] =
          (paymentBreakdown[p.method] ?? 0) + toNumber(p.amount as never);
      }
    }

    return {
      billCount: bills.length,
      totalSales: roundMoney(totalSales),
      totalTax: roundMoney(totalTax),
      totalDiscount: roundMoney(totalDiscount),
      paymentBreakdown: Object.fromEntries(
        Object.entries(paymentBreakdown).map(([k, v]) => [k, roundMoney(v)]),
      ),
    };
  }

  private formatBillListItem(
    bill: {
      id: string;
      billNumber: number;
      total: { toString: () => string };
      discountAmount: { toString: () => string };
      createdAt: Date;
      payments: Array<{ method: string; amount: { toString: () => string } }>;
      createdBy: { id: string; name: string };
      order: { orderNumber: number; table: { name: string; area: { name: string } } };
    },
    outlet: { name: string },
  ) {
    const primaryPayment = bill.payments[0]?.method ?? 'CASH';
    return {
      id: bill.id,
      billNumber: bill.billNumber,
      orderNumber: bill.order.orderNumber,
      table: bill.order.table.name,
      area: bill.order.table.area.name,
      total: toNumber(bill.total as never),
      discountAmount: toNumber(bill.discountAmount as never),
      paymentMethod: primaryPayment,
      paymentMethods: bill.payments.map((p) => p.method),
      cashier: bill.createdBy.name,
      cashierId: bill.createdBy.id,
      createdAt: bill.createdAt,
      outletName: outlet.name,
    };
  }

  private mapLineItemsFromBill(
    bill: {
      lineItems: Array<{
        name: string;
        variation: string | null;
        quantity: number;
        unitPrice: { toString: () => string };
        lineTotal: { toString: () => string };
        addons: string | null;
      }>;
      order: {
        items: Array<{
          status: string;
          menuItem: { name: string };
          variation: { name: string } | null;
          quantity: number;
          unitPrice: { toString: () => string };
          addons: Array<{ addon: { name: string }; price: { toString: () => string } }>;
        }>;
      };
    },
  ) {
    if (bill.lineItems.length > 0) {
      return bill.lineItems.map((item) => ({
        name: item.name,
        variation: item.variation ?? undefined,
        quantity: item.quantity,
        unitPrice: toNumber(item.unitPrice as never),
        addons: this.parseAddonsJson(item.addons),
        lineTotal: toNumber(item.lineTotal as never),
      }));
    }

    return this.billableItems(bill.order.items).map((item) => ({
      name: item.menuItem.name,
      variation: item.variation?.name,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice as never),
      addons: item.addons.map((a) => ({
        name: a.addon.name,
        price: toNumber(a.price as never),
      })),
      lineTotal: this.itemLineTotal(item),
    }));
  }

  private async loadOrder(orderId: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: true,
            variation: true,
            addons: { include: { addon: true } },
          },
        },
        table: true,
        outlet: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    await this.outletAccess.verifyOutletAccess(order.outletId, user);

    return { order, outlet: order.outlet };
  }

  private mapBillItems(
    items: Array<{
      quantity: number;
      unitPrice: { toString: () => string };
      addons: Array<{ price: { toString: () => string } }>;
    }>,
  ) {
    return items.map((item) => ({
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice as never),
      addons: item.addons.map((a) => ({ price: toNumber(a.price as never) })),
    }));
  }

  private itemLineTotal(item: {
    quantity: number;
    unitPrice: { toString: () => string };
    addons: Array<{ price: { toString: () => string } }>;
  }) {
    const unit = toNumber(item.unitPrice as never);
    const addons = item.addons.reduce((s, a) => s + toNumber(a.price as never), 0);
    return roundMoney((unit + addons) * item.quantity);
  }

  private formatBill(
    bill: {
      id: string;
      billNumber: number;
      subtotal: { toString: () => string };
      discountAmount: { toString: () => string };
      taxAmount: { toString: () => string };
      taxRate: { toString: () => string };
      total: { toString: () => string };
      createdAt: Date;
      payments: Array<{ method: string; amount: { toString: () => string }; reference: string | null }>;
      order?: { table: { name: string } };
      createdBy?: { name: string };
    },
    outlet: { name: string; gstNumber: string | null },
  ) {
    return {
      id: bill.id,
      billNumber: bill.billNumber,
      outletName: outlet.name,
      gstNumber: outlet.gstNumber,
      table: bill.order?.table.name,
      cashier: bill.createdBy?.name,
      subtotal: toNumber(bill.subtotal as never),
      discountAmount: toNumber(bill.discountAmount as never),
      taxAmount: toNumber(bill.taxAmount as never),
      taxRate: toNumber(bill.taxRate as never),
      total: toNumber(bill.total as never),
      payments: bill.payments.map((p) => ({
        method: p.method,
        amount: toNumber(p.amount as never),
        reference: p.reference,
      })),
      createdAt: bill.createdAt,
    };
  }

  private formatBillDetail(
    bill: NonNullable<Awaited<ReturnType<typeof this.prisma.bill.findUnique>>> & {
      lineItems: Array<{
        name: string;
        variation: string | null;
        quantity: number;
        unitPrice: { toString: () => string };
        lineTotal: { toString: () => string };
        addons: string | null;
      }>;
      order: {
        orderNumber: number;
        table: { name: string; area: { name: string } };
        items: Array<{
          status: string;
          menuItem: { name: string };
          variation: { name: string } | null;
          quantity: number;
          unitPrice: { toString: () => string };
          addons: Array<{ addon: { name: string }; price: { toString: () => string } }>;
        }>;
      };
      payments: Array<{ method: string; amount: { toString: () => string }; reference: string | null }>;
      createdBy: { name: string };
    },
    outlet: { name: string; address: string | null; gstNumber: string | null },
  ) {
    return {
      ...this.formatBill(bill, outlet),
      address: outlet.address,
      orderNumber: bill.order.orderNumber,
      area: bill.order.table.area.name,
      table: bill.order.table.name,
      cashier: bill.createdBy.name,
      items: this.mapLineItemsFromBill(bill),
    };
  }
}
