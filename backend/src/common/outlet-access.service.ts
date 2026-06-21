import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './auth.guard';

@Injectable()
export class OutletAccessService {
  constructor(private prisma: PrismaService) {}

  async verifyOutletAccess(outletId: string, user: AuthUser) {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
    });

    if (!outlet) {
      throw new NotFoundException('Outlet not found');
    }

    if (outlet.organizationId !== user.organizationId) {
      throw new ForbiddenException('Access denied to this outlet');
    }

    return outlet;
  }
}
