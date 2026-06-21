import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutletAccessService } from '../common/outlet-access.service';
import { AuthUser } from '../common/auth.guard';
import { CreateOutletDto, UpdateOutletDto } from './outlets.dto';

@Injectable()
export class OutletsService {
  constructor(
    private prisma: PrismaService,
    private outletAccess: OutletAccessService,
  ) {}

  list(user: AuthUser) {
    return this.prisma.outlet.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async get(outletId: string, user: AuthUser) {
    await this.outletAccess.verifyOutletAccess(outletId, user);
    return this.prisma.outlet.findUnique({ where: { id: outletId } });
  }

  create(user: AuthUser, dto: CreateOutletDto) {
    return this.prisma.outlet.create({
      data: {
        name: dto.name,
        address: dto.address,
        gstNumber: dto.gstNumber,
        gstRate: dto.gstRate ?? 5,
        organizationId: user.organizationId,
      },
    });
  }

  async update(outletId: string, user: AuthUser, dto: UpdateOutletDto) {
    await this.outletAccess.verifyOutletAccess(outletId, user);
    return this.prisma.outlet.update({
      where: { id: outletId },
      data: dto,
    });
  }
}
