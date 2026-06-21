import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/auth.guard';
import { CreateStaffDto, UpdateStaffDto } from './users.dto';

const ASSIGNABLE_ROLES: UserRole[] = ['MANAGER', 'CASHIER', 'CAPTAIN', 'KITCHEN'];

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  list(user: AuthUser) {
    return this.prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pin: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  async create(actor: AuthUser, dto: CreateStaffDto) {
    this.assertCanManageStaff(actor);
    this.assertAssignableRole(dto.role);

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    if (dto.pin) {
      await this.assertPinAvailable(actor.organizationId, dto.pin);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role,
        pin: dto.pin ?? null,
        organizationId: actor.organizationId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pin: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(actor: AuthUser, userId: string, dto: UpdateStaffDto) {
    this.assertCanManageStaff(actor);

    const target = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: actor.organizationId },
    });
    if (!target) {
      throw new NotFoundException('Staff member not found');
    }

    if (target.role === 'OWNER' && actor.id !== target.id) {
      throw new ForbiddenException('Cannot modify the owner account');
    }

    if (dto.role) {
      this.assertAssignableRole(dto.role);
      if (target.role === 'OWNER') {
        throw new ForbiddenException('Cannot change owner role');
      }
    }

    if (dto.pin !== undefined && dto.pin !== null) {
      await this.assertPinAvailable(actor.organizationId, dto.pin, userId);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        role: dto.role,
        isActive: dto.isActive,
        pin: dto.pin === null ? null : dto.pin,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pin: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async resetPassword(actor: AuthUser, userId: string, password: string) {
    this.assertCanManageStaff(actor);

    const target = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: actor.organizationId },
    });
    if (!target) {
      throw new NotFoundException('Staff member not found');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }

  private assertCanManageStaff(user: AuthUser) {
    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Only the owner can manage staff');
    }
  }

  private assertAssignableRole(role: UserRole) {
    if (!ASSIGNABLE_ROLES.includes(role)) {
      throw new BadRequestException('Invalid staff role');
    }
  }

  private async assertPinAvailable(orgId: string, pin: string, excludeUserId?: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        organizationId: orgId,
        pin,
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException('PIN already used by another staff member');
    }
  }
}
