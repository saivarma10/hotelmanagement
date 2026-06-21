import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutletAccessService } from '../common/outlet-access.service';
import { AuthUser } from '../common/auth.guard';

@Injectable()
export class KitchenService {
  constructor(
    private prisma: PrismaService,
    private outletAccess: OutletAccessService,
  ) {}

  async getQueue(outletId: string, user: AuthUser) {
    await this.outletAccess.verifyOutletAccess(outletId, user);

    const kots = await this.prisma.kot.findMany({
      where: {
        order: { outletId, status: { in: ['OPEN', 'KOT_SENT'] } },
        items: { some: { orderItem: { status: 'SENT_TO_KITCHEN' } } },
      },
      include: {
        items: {
          include: {
            orderItem: {
              include: {
                menuItem: true,
                variation: true,
                addons: { include: { addon: true } },
              },
            },
          },
        },
        order: { include: { table: { include: { area: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const tickets = kots.map((kot) => ({
      id: kot.id,
      kotNumber: kot.kotNumber,
      createdAt: kot.createdAt,
      orderNumber: kot.order.orderNumber,
      table: kot.order.table.name,
      area: kot.order.table.area.name,
      items: kot.items
        .filter((ki) => ki.orderItem.status === 'SENT_TO_KITCHEN')
        .map((ki) => this.formatKitchenItem(ki.orderItem)),
    }));

    const aggregateMap = new Map<
      string,
      { key: string; name: string; variation?: string; quantity: number; itemIds: string[] }
    >();

    for (const ticket of tickets) {
      for (const item of ticket.items) {
        const key = `${item.name}|${item.variation ?? ''}`;
        const existing = aggregateMap.get(key) ?? {
          key,
          name: item.name,
          variation: item.variation,
          quantity: 0,
          itemIds: [],
        };
        existing.quantity += item.quantity;
        existing.itemIds.push(item.id);
        aggregateMap.set(key, existing);
      }
    }

    const ageMinutes = (date: Date) =>
      Math.floor((Date.now() - new Date(date).getTime()) / 60000);

    return {
      tickets: tickets.map((t) => ({ ...t, ageMinutes: ageMinutes(t.createdAt) })),
      aggregated: Array.from(aggregateMap.values()).sort((a, b) => b.quantity - a.quantity),
      pendingCount: tickets.reduce((s, t) => s + t.items.length, 0),
    };
  }

  async markItemReady(orderItemId: string, user: AuthUser) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });
    if (!item) throw new NotFoundException('Order item not found');
    if (item.status !== 'SENT_TO_KITCHEN') {
      throw new BadRequestException('Item is not in kitchen queue');
    }
    await this.outletAccess.verifyOutletAccess(item.order.outletId, user);

    await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: 'SERVED' },
    });

    return { success: true };
  }

  async markKotReady(kotId: string, user: AuthUser) {
    const kot = await this.prisma.kot.findUnique({
      where: { id: kotId },
      include: { order: true, items: { include: { orderItem: true } } },
    });
    if (!kot) throw new NotFoundException('KOT not found');
    await this.outletAccess.verifyOutletAccess(kot.order.outletId, user);

    const ids = kot.items
      .filter((ki) => ki.orderItem.status === 'SENT_TO_KITCHEN')
      .map((ki) => ki.orderItemId);

    if (!ids.length) {
      throw new BadRequestException('No pending items on this KOT');
    }

    await this.prisma.orderItem.updateMany({
      where: { id: { in: ids } },
      data: { status: 'SERVED' },
    });

    return { success: true, count: ids.length };
  }

  private formatKitchenItem(item: {
    id: string;
    quantity: number;
    notes: string | null;
    status: string;
    menuItem: { name: string };
    variation: { name: string } | null;
    addons: Array<{ addon: { name: string } }>;
  }) {
    return {
      id: item.id,
      name: item.menuItem.name,
      variation: item.variation?.name,
      quantity: item.quantity,
      notes: item.notes,
      status: item.status,
      addons: item.addons.map((a) => a.addon.name),
    };
  }
}
