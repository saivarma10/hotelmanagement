import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthUser } from '../common/auth.guard';
import { ROLE_PERMISSIONS, Permission } from '../common/permissions';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new UnauthorizedException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: dto.organizationName },
      });

      const outlet = await tx.outlet.create({
        data: {
          name: dto.outletName,
          organizationId: org.id,
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash,
          role: 'OWNER',
          organizationId: org.id,
        },
      });

      return { org, outlet, user };
    });

    return this.buildAuthResponse(result.user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated. Contact your manager.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  /** Petpooja-style quick staff switch on shared POS terminal */
  async pinSwitch(actor: AuthUser, pin: string) {
    const canSwitch = ['OWNER', 'MANAGER', 'CASHIER', 'CAPTAIN'].includes(actor.role);
    if (!canSwitch) {
      throw new ForbiddenException('PIN switch is not available for your role');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        organizationId: actor.organizationId,
        pin,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid PIN');
    }

    return this.buildAuthResponse(user);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pin: true,
        isActive: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            outlets: { select: { id: true, name: true, gstRate: true, address: true, gstNumber: true } },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const permissions = ROLE_PERMISSIONS[user.role] ?? [];

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      organizationId: user.organizationId,
      organization: user.organization,
      permissions,
      hasPin: !!user.pin,
    };
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string;
  }) {
    const payload: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    };

    const permissions: Permission[] = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] ?? [];

    return {
      accessToken: this.jwt.sign(payload),
      user: { ...payload, permissions },
    };
  }
}
