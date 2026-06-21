import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutletAccessService } from '../common/outlet-access.service';
import { AuthUser } from '../common/auth.guard';
import {
  CreateCategoryDto,
  CreateMenuItemDto,
  CreateAddonDto,
  UpdateMenuItemDto,
} from './menus.dto';
import { toNumber } from '../common/money.util';

@Injectable()
export class MenusService {
  constructor(
    private prisma: PrismaService,
    private outletAccess: OutletAccessService,
  ) {}

  async getFullMenu(outletId: string, user: AuthUser) {
    await this.outletAccess.verifyOutletAccess(outletId, user);

    const [categories, addons] = await Promise.all([
      this.prisma.category.findMany({
        where: { outletId, isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
              variations: { where: { isActive: true } },
              addons: { include: { addon: true } },
            },
          },
        },
      }),
      this.prisma.addon.findMany({
        where: { outletId, isActive: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      categories: categories.map((cat) => ({
        ...cat,
        items: cat.items.map((item) => ({
          ...item,
          price: toNumber(item.price),
          variations: item.variations.map((v) => ({ ...v, price: toNumber(v.price) })),
          addons: item.addons.map((ia) => ({
            ...ia.addon,
            price: toNumber(ia.addon.price),
          })),
        })),
      })),
      addons: addons.map((a) => ({ ...a, price: toNumber(a.price) })),
    };
  }

  async createCategory(outletId: string, user: AuthUser, dto: CreateCategoryDto) {
    await this.outletAccess.verifyOutletAccess(outletId, user);
    return this.prisma.category.create({
      data: { name: dto.name, sortOrder: dto.sortOrder ?? 0, outletId },
    });
  }

  async createMenuItem(outletId: string, user: AuthUser, dto: CreateMenuItemDto) {
    await this.outletAccess.verifyOutletAccess(outletId, user);

    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, outletId },
    });
    if (!category) {
      throw new NotFoundException('Category not found in this outlet');
    }

    return this.prisma.menuItem.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        isVeg: dto.isVeg ?? true,
        categoryId: dto.categoryId,
        variations: dto.variations?.length
          ? { create: dto.variations.map((v) => ({ name: v.name, price: v.price })) }
          : undefined,
        addons: dto.addonIds?.length
          ? { create: dto.addonIds.map((addonId) => ({ addonId })) }
          : undefined,
      },
      include: { variations: true, addons: { include: { addon: true } } },
    });
  }

  async createAddon(outletId: string, user: AuthUser, dto: CreateAddonDto) {
    await this.outletAccess.verifyOutletAccess(outletId, user);
    return this.prisma.addon.create({
      data: { name: dto.name, price: dto.price, outletId },
    });
  }

  async updateMenuItem(itemId: string, user: AuthUser, dto: UpdateMenuItemDto) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { category: true },
    });
    if (!item) throw new NotFoundException('Menu item not found');
    await this.outletAccess.verifyOutletAccess(item.category.outletId, user);

    return this.prisma.menuItem.update({
      where: { id: itemId },
      data: dto,
    });
  }
}
