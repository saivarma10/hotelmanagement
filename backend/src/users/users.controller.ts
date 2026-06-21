import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard, AuthUser } from '../common/auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { RequirePermissions } from '../common/roles.decorator';
import { Permission } from '../common/permissions';
import { CreateStaffDto, ResetStaffPasswordDto, UpdateStaffDto } from './users.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @RequirePermissions(Permission.STAFF_MANAGE)
  list(@Request() req: { user: AuthUser }) {
    return this.users.list(req.user);
  }

  @Post()
  @RequirePermissions(Permission.STAFF_MANAGE)
  create(@Body() dto: CreateStaffDto, @Request() req: { user: AuthUser }) {
    return this.users.create(req.user, dto);
  }

  @Patch(':userId')
  @RequirePermissions(Permission.STAFF_MANAGE)
  update(
    @Param('userId') userId: string,
    @Body() dto: UpdateStaffDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.users.update(req.user, userId, dto);
  }

  @Post(':userId/reset-password')
  @RequirePermissions(Permission.STAFF_MANAGE)
  resetPassword(
    @Param('userId') userId: string,
    @Body() dto: ResetStaffPasswordDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.users.resetPassword(req.user, userId, dto.password);
  }
}
