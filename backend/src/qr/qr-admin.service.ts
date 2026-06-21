import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OutletAccessService } from '../common/outlet-access.service';
import { AuthUser } from '../common/auth.guard';

@Injectable()
export class QrAdminService {
  constructor(
    private prisma: PrismaService,
    private outletAccess: OutletAccessService,
  ) {}

  async listTableQrCodes(outletId: string, user: AuthUser) {
    await this.outletAccess.verifyOutletAccess(outletId, user);

    const outlet = await this.prisma.outlet.findUnique({ where: { id: outletId } });
    if (!outlet) throw new NotFoundException('Outlet not found');

    const areas = await this.prisma.area.findMany({
      where: { outletId },
      orderBy: { sortOrder: 'asc' },
      include: {
        tables: { orderBy: { name: 'asc' }, select: { id: true, name: true, qrToken: true } },
      },
    });

    for (const area of areas) {
      for (const table of area.tables) {
        if (!table.qrToken) {
          const updated = await this.prisma.table.update({
            where: { id: table.id },
            data: { qrToken: randomUUID().replace(/-/g, '').slice(0, 16) },
            select: { qrToken: true },
          });
          table.qrToken = updated.qrToken;
        }
      }
    }

    return {
      qrMenuEnabled: outlet.qrMenuEnabled,
      outletName: outlet.name,
      areas: areas.map((area) => ({
        id: area.id,
        name: area.name,
        tables: area.tables,
      })),
    };
  }

  async setQrMenuEnabled(outletId: string, user: AuthUser, enabled: boolean) {
    await this.outletAccess.verifyOutletAccess(outletId, user);

    const outlet = await this.prisma.outlet.update({
      where: { id: outletId },
      data: { qrMenuEnabled: enabled },
      select: { id: true, qrMenuEnabled: true },
    });

    return outlet;
  }
}
