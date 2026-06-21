import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { QrAdminService } from './qr-admin.service';
import { JwtAuthGuard, AuthUser } from '../common/auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { RequirePermissions } from '../common/roles.decorator';
import { Permission } from '../common/permissions';

class ToggleQrMenuDto {
  @IsBoolean()
  enabled!: boolean;
}

@Controller('outlets/:outletId/qr-menu')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QrAdminController {
  constructor(private qrAdmin: QrAdminService) {}

  @Get()
  @RequirePermissions(Permission.SETUP_MANAGE)
  list(@Param('outletId') outletId: string, @Request() req: { user: AuthUser }) {
    return this.qrAdmin.listTableQrCodes(outletId, req.user);
  }

  @Patch()
  @RequirePermissions(Permission.SETUP_MANAGE)
  toggle(
    @Param('outletId') outletId: string,
    @Body() dto: ToggleQrMenuDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.qrAdmin.setQrMenuEnabled(outletId, req.user, dto.enabled);
  }
}
