import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TableStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OutletAccessService } from '../common/outlet-access.service';
import { AuthUser } from '../common/auth.guard';
import { CreateAreaDto, CreateTableDto } from './tables.dto';

@Injectable()
export class TablesService {
  constructor(
    private prisma: PrismaService,
    private outletAccess: OutletAccessService,
  ) {}

  async getFloorPlan(outletId: string, user: AuthUser) {
    await this.outletAccess.verifyOutletAccess(outletId, user);

    const areas = await this.prisma.area.findMany({
      where: { outletId },
      orderBy: { sortOrder: 'asc' },
      include: {
        tables: {
          orderBy: { name: 'asc' },
          include: {
            orders: {
              where: { status: { in: ['OPEN', 'KOT_SENT'] } },
              select: {
                id: true,
                orderNumber: true,
                status: true,
                _count: { select: { items: true } },
              },
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    return areas.map((area) => ({
      ...area,
      tables: area.tables.map((table) => ({
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        status: table.status,
        activeOrder: table.orders[0] ?? null,
      })),
    }));
  }

  async createArea(outletId: string, user: AuthUser, dto: CreateAreaDto) {
    await this.outletAccess.verifyOutletAccess(outletId, user);
    return this.prisma.area.create({
      data: { name: dto.name, sortOrder: dto.sortOrder ?? 0, outletId },
    });
  }

  async createTable(areaId: string, user: AuthUser, dto: CreateTableDto) {
    const area = await this.prisma.area.findUnique({
      where: { id: areaId },
      include: { outlet: true },
    });
    if (!area) throw new NotFoundException('Area not found');
    await this.outletAccess.verifyOutletAccess(area.outletId, user);

    return this.prisma.table.create({
      data: {
        name: dto.name,
        capacity: dto.capacity ?? 4,
        areaId,
        qrToken: randomUUID().replace(/-/g, '').slice(0, 16),
      },
    });
  }

  async updateTableStatus(tableId: string, status: TableStatus, user: AuthUser) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: { area: true },
    });
    if (!table) throw new NotFoundException('Table not found');
    await this.outletAccess.verifyOutletAccess(table.area.outletId, user);

    return this.prisma.table.update({
      where: { id: tableId },
      data: { status },
    });
  }

  async getTableWithOrder(tableId: string, user: AuthUser) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: {
        area: { include: { outlet: true } },
        orders: {
          where: { status: { in: ['OPEN', 'KOT_SENT'] } },
          include: {
            items: {
              include: {
                menuItem: true,
                variation: true,
                addons: { include: { addon: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!table) throw new NotFoundException('Table not found');
    await this.outletAccess.verifyOutletAccess(table.area.outletId, user);

    return {
      id: table.id,
      name: table.name,
      capacity: table.capacity,
      status: table.status,
      area: { id: table.area.id, name: table.area.name },
      activeOrder: table.orders[0] ?? null,
    };
  }
}
