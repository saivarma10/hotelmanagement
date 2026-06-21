import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toNumber } from '../common/money.util';

@Injectable()
export class QrMenuService {
  constructor(private prisma: PrismaService) {}

  /** Public guest menu — no auth (Petpooja view-only QR menu) */
  async getPublicMenu(qrToken: string) {
    const table = await this.prisma.table.findUnique({
      where: { qrToken },
      include: {
        area: {
          include: {
            outlet: true,
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException('Menu not found');
    }

    const outlet = table.area.outlet;
    if (!outlet.qrMenuEnabled) {
      throw new NotFoundException('QR menu is currently unavailable');
    }

    const categories = await this.prisma.category.findMany({
      where: { outletId: outlet.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            variations: { where: { isActive: true }, orderBy: { name: 'asc' } },
            addons: {
              include: { addon: true },
              where: { addon: { isActive: true } },
            },
          },
        },
      },
    });

    const activeCategories = categories
      .filter((cat) => cat.items.length > 0)
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        items: cat.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: toNumber(item.price),
          isVeg: item.isVeg,
          variations: item.variations.map((v) => ({
            id: v.id,
            name: v.name,
            price: toNumber(v.price),
          })),
          addons: item.addons.map((ia) => ({
            id: ia.addon.id,
            name: ia.addon.name,
            price: toNumber(ia.addon.price),
          })),
        })),
      }));

    return {
      outlet: {
        name: outlet.name,
        address: outlet.address,
      },
      table: {
        name: table.name,
        area: table.area.name,
      },
      viewOnly: true,
      categories: activeCategories,
    };
  }
}
