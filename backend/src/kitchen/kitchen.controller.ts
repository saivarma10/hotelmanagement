import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { JwtAuthGuard, AuthUser } from '../common/auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { RequirePermissions } from '../common/roles.decorator';
import { Permission } from '../common/permissions';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class KitchenController {
  constructor(private kitchen: KitchenService) {}

  @Get('outlets/:outletId/kitchen')
  @RequirePermissions(Permission.KITCHEN_VIEW)
  getQueue(@Param('outletId') outletId: string, @Request() req: { user: AuthUser }) {
    return this.kitchen.getQueue(outletId, req.user);
  }

  @Post('kitchen/items/:orderItemId/ready')
  @RequirePermissions(Permission.KITCHEN_VIEW)
  markItemReady(
    @Param('orderItemId') orderItemId: string,
    @Request() req: { user: AuthUser },
  ) {
    return this.kitchen.markItemReady(orderItemId, req.user);
  }

  @Post('kitchen/kots/:kotId/ready')
  @RequirePermissions(Permission.KITCHEN_VIEW)
  markKotReady(@Param('kotId') kotId: string, @Request() req: { user: AuthUser }) {
    return this.kitchen.markKotReady(kotId, req.user);
  }
}
