import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { OutletsService } from './outlets.service';
import { JwtAuthGuard, AuthUser } from '../common/auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { RequirePermissions } from '../common/roles.decorator';
import { Permission } from '../common/permissions';
import { CreateOutletDto, UpdateOutletDto } from './outlets.dto';

@Controller('outlets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OutletsController {
  constructor(private outlets: OutletsService) {}

  @Get()
  list(@Request() req: { user: AuthUser }) {
    return this.outlets.list(req.user);
  }

  @Get(':outletId')
  get(@Param('outletId') outletId: string, @Request() req: { user: AuthUser }) {
    return this.outlets.get(outletId, req.user);
  }

  @Post()
  @RequirePermissions(Permission.SETUP_MANAGE)
  create(@Body() dto: CreateOutletDto, @Request() req: { user: AuthUser }) {
    return this.outlets.create(req.user, dto);
  }

  @Patch(':outletId')
  @RequirePermissions(Permission.SETUP_MANAGE)
  update(
    @Param('outletId') outletId: string,
    @Body() dto: UpdateOutletDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.outlets.update(outletId, req.user, dto);
  }
}
