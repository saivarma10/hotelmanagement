import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { AuthUser } from './auth.guard';
import { Permission, roleHasPermission, roleInList } from './permissions';
import { ROLES_KEY, PERMISSIONS_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length && !requiredPermissions?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: AuthUser }>();
    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    if (requiredRoles?.length && !roleInList(user.role, requiredRoles)) {
      throw new ForbiddenException('You do not have permission for this action');
    }

    if (requiredPermissions?.length) {
      const ok = requiredPermissions.every((p) => roleHasPermission(user.role, p));
      if (!ok) {
        throw new ForbiddenException('You do not have permission for this action');
      }
    }

    return true;
  }
}
