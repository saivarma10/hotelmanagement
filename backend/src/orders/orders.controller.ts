import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard, AuthUser } from '../common/auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { RequirePermissions } from '../common/roles.decorator';
import { Permission } from '../common/permissions';
import { AddOrderItemDto, SendKotDto } from './orders.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post('tables/:tableId/outlets/:outletId')
  @RequirePermissions(Permission.ORDERS_MANAGE)
  create(
    @Param('tableId') tableId: string,
    @Param('outletId') outletId: string,
    @Request() req: { user: AuthUser },
  ) {
    return this.orders.createOrder(tableId, outletId, req.user);
  }

  @Get(':orderId')
  @RequirePermissions(Permission.ORDERS_MANAGE)
  get(@Param('orderId') orderId: string, @Request() req: { user: AuthUser }) {
    return this.orders.getOrder(orderId, req.user);
  }

  @Post(':orderId/items')
  @RequirePermissions(Permission.ORDERS_MANAGE)
  addItem(
    @Param('orderId') orderId: string,
    @Body() dto: AddOrderItemDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.orders.addItem(orderId, req.user, dto);
  }

  @Delete('items/:orderItemId')
  @RequirePermissions(Permission.ORDERS_MANAGE)
  removeItem(
    @Param('orderItemId') orderItemId: string,
    @Request() req: { user: AuthUser },
  ) {
    return this.orders.cancelItem(orderItemId, req.user);
  }

  @Post('items/:orderItemId/cancel')
  @RequirePermissions(Permission.ORDERS_MANAGE)
  cancelItem(
    @Param('orderItemId') orderItemId: string,
    @Request() req: { user: AuthUser },
  ) {
    return this.orders.cancelItem(orderItemId, req.user);
  }

  @Post(':orderId/kot')
  @RequirePermissions(Permission.ORDERS_MANAGE)
  sendKot(
    @Param('orderId') orderId: string,
    @Body() dto: SendKotDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.orders.sendKot(orderId, req.user, dto);
  }

  @Post(':orderId/cancel')
  @RequirePermissions(Permission.ORDERS_MANAGE)
  cancel(@Param('orderId') orderId: string, @Request() req: { user: AuthUser }) {
    return this.orders.cancelOrder(orderId, req.user);
  }
}
