import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutletAccessService } from '../common/outlet-access.service';
import { CounterService } from '../common/counter.service';
import { AuthUser } from '../common/auth.guard';
import { AddOrderItemDto, SendKotDto } from './orders.dto';
import { toNumber } from '../common/money.util';

const orderInclude = {
  items: {
    include: {
      menuItem: true,
      variation: true,
      addons: { include: { addon: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  table: { include: { area: true } },
  kots: { include: { items: { include: { orderItem: { include: { menuItem: true, variation: true } } } } } },
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private outletAccess: OutletAccessService,
    private counter: CounterService,
  ) {}

  async createOrder(tableId: string, outletId: string, user: AuthUser) {
    await this.outletAccess.verifyOutletAccess(outletId, user);

    const table = await this.prisma.table.findFirst({
      where: { id: tableId, area: { outletId } },
    });
    if (!table) throw new NotFoundException('Table not found');

    const existing = await this.prisma.order.findFirst({
      where: { tableId, status: { in: ['OPEN', 'KOT_SENT'] } },
    });
    if (existing) {
      return this.getOrder(existing.id, user);
    }

    const orderNumber = await this.counter.nextOrderNumber(outletId);

    const order = await this.prisma.$transaction(async (tx) => {
      await tx.table.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' },
      });

      return tx.order.create({
        data: {
          orderNumber,
          tableId,
          outletId,
          createdById: user.id,
        },
        include: orderInclude,
      });
    });

    return this.formatOrder(order);
  }

  async getOrder(orderId: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    await this.outletAccess.verifyOutletAccess(order.outletId, user);
    return this.formatOrder(order);
  }

  async addItem(orderId: string, user: AuthUser, dto: AddOrderItemDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'BILLED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot modify a closed order');
    }
    await this.outletAccess.verifyOutletAccess(order.outletId, user);

    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: dto.menuItemId },
      include: { variations: true, addons: true },
    });
    if (!menuItem || !menuItem.isActive) {
      throw new BadRequestException('Menu item not available');
    }

    let unitPrice = toNumber(menuItem.price);
    if (dto.variationId) {
      const variation = menuItem.variations.find((v) => v.id === dto.variationId);
      if (!variation) throw new BadRequestException('Invalid variation');
      unitPrice = toNumber(variation.price);
    }

    const addonRecords = dto.addonIds?.length
      ? await this.prisma.addon.findMany({
          where: { id: { in: dto.addonIds }, isActive: true },
        })
      : [];

    await this.prisma.orderItem.create({
      data: {
        orderId,
        menuItemId: dto.menuItemId,
        variationId: dto.variationId,
        quantity: dto.quantity ?? 1,
        unitPrice,
        notes: dto.notes,
        addons: {
          create: addonRecords.map((addon) => ({
            addonId: addon.id,
            price: addon.price,
          })),
        },
      },
    });

    return this.getOrder(orderId, user);
  }

  async cancelItem(orderItemId: string, user: AuthUser) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });
    if (!item) throw new NotFoundException('Order item not found');
    if (item.order.status === 'BILLED') {
      throw new BadRequestException('Cannot cancel item on a billed order');
    }
    if (item.status === 'CANCELLED') {
      throw new BadRequestException('Item already cancelled');
    }
    if (item.status === 'SERVED') {
      throw new BadRequestException('Cannot cancel item already served');
    }
    await this.outletAccess.verifyOutletAccess(item.order.outletId, user);

    if (item.status === 'PENDING') {
      await this.prisma.orderItem.delete({ where: { id: orderItemId } });
    } else {
      await this.prisma.orderItem.update({
        where: { id: orderItemId },
        data: { status: 'CANCELLED' },
      });
    }

    return this.getOrder(item.orderId, user);
  }

  async removeItem(orderItemId: string, user: AuthUser) {
    return this.cancelItem(orderItemId, user);
  }

  async sendKot(orderId: string, user: AuthUser, dto: SendKotDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    await this.outletAccess.verifyOutletAccess(order.outletId, user);

    const pendingItems = order.items.filter(
      (item) =>
        item.status === 'PENDING' &&
        (!dto.orderItemIds?.length || dto.orderItemIds.includes(item.id)),
    );

    if (!pendingItems.length) {
      throw new BadRequestException('No pending items to send');
    }

    const kotNumber = await this.counter.nextKotNumber(order.outletId);

    const kot = await this.prisma.$transaction(async (tx) => {
      const created = await tx.kot.create({
        data: {
          kotNumber,
          orderId,
          items: {
            create: pendingItems.map((item) => ({ orderItemId: item.id })),
          },
        },
        include: {
          items: {
            include: {
              orderItem: {
                include: { menuItem: true, variation: true, addons: { include: { addon: true } } },
              },
            },
          },
          order: { include: { table: { include: { area: true } } } },
        },
      });

      await tx.orderItem.updateMany({
        where: { id: { in: pendingItems.map((i) => i.id) } },
        data: { status: 'SENT_TO_KITCHEN' },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'KOT_SENT' },
      });

      return created;
    });

    return {
      id: kot.id,
      kotNumber: kot.kotNumber,
      createdAt: kot.createdAt,
      table: kot.order.table.name,
      area: kot.order.table.area.name,
      orderNumber: kot.order.orderNumber,
      items: kot.items.map((ki) => ({
        name: ki.orderItem.menuItem.name,
        variation: ki.orderItem.variation?.name,
        quantity: ki.orderItem.quantity,
        notes: ki.orderItem.notes,
        addons: ki.orderItem.addons.map((a) => a.addon.name),
      })),
    };
  }

  async cancelOrder(orderId: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'BILLED') {
      throw new BadRequestException('Cannot cancel a billed order');
    }
    await this.outletAccess.verifyOutletAccess(order.outletId, user);

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });
      await tx.table.update({
        where: { id: order.tableId },
        data: { status: 'VACANT' },
      });
    });

    return { success: true };
  }

  private formatOrder(order: NonNullable<Awaited<ReturnType<typeof this.fetchOrder>>>) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      notes: order.notes,
      table: { id: order.table.id, name: order.table.name, area: order.table.area.name },
      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: toNumber(item.unitPrice),
        notes: item.notes,
        status: item.status,
        menuItem: item.menuItem,
        variation: item.variation,
        addons: item.addons.map((a) => ({
          name: a.addon.name,
          price: toNumber(a.price),
        })),
        lineTotal: this.lineTotal(item),
      })),
      kots: order.kots,
    };
  }

  private fetchOrder(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
  }

  private lineTotal(item: {
    quantity: number;
    unitPrice: Parameters<typeof toNumber>[0];
    addons: Array<{ price: Parameters<typeof toNumber>[0] }>;
  }) {
    const unit = toNumber(item.unitPrice);
    const addons = item.addons.reduce((s, a) => s + toNumber(a.price), 0);
    return Math.round((unit + addons) * item.quantity * 100) / 100;
  }
}
