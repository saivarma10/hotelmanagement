import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard, AuthUser } from '../common/auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { RequirePermissions } from '../common/roles.decorator';
import { Permission } from '../common/permissions';
import { CreateBillDto, SettleBillDto, SplitBillSettleDto, ListBillsQueryDto } from './billing.dto';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private billing: BillingService) {}

  @Get('outlets/:outletId/bills')
  @RequirePermissions(Permission.BILLS_VIEW)
  listBills(
    @Param('outletId') outletId: string,
    @Query() query: ListBillsQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.billing.listBills(outletId, req.user, query);
  }

  @Get('outlets/:outletId/bills/day-end')
  @RequirePermissions(Permission.BILLS_VIEW)
  dayEnd(
    @Param('outletId') outletId: string,
    @Query('date') date: string | undefined,
    @Request() req: { user: AuthUser },
  ) {
    return this.billing.getDayEndSummary(outletId, req.user, date);
  }

  @Get('orders/:orderId/preview')
  @RequirePermissions(Permission.BILLING_MANAGE)
  preview(
    @Param('orderId') orderId: string,
    @Query('discountPercent') discountPercent?: string,
    @Query('discountAmount') discountAmount?: string,
    @Request() req?: { user: AuthUser },
  ) {
    return this.billing.previewBill(orderId, req!.user, {
      discountPercent: discountPercent ? Number(discountPercent) : undefined,
      discountAmount: discountAmount ? Number(discountAmount) : undefined,
    });
  }

  @Post('orders/:orderId/settle')
  @RequirePermissions(Permission.BILLING_MANAGE)
  settle(
    @Param('orderId') orderId: string,
    @Body() body: SettleBillDto & CreateBillDto,
    @Request() req: { user: AuthUser },
  ) {
    const { payments, discountPercent, discountAmount } = body;
    return this.billing.settleBill(
      orderId,
      req.user,
      { payments },
      { discountPercent, discountAmount },
    );
  }

  @Post('orders/:orderId/split-settle')
  @RequirePermissions(Permission.BILLING_MANAGE)
  splitSettle(
    @Param('orderId') orderId: string,
    @Body() dto: SplitBillSettleDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.billing.splitAndSettle(orderId, req.user, dto);
  }

  @Get('bills/:billId')
  @RequirePermissions(Permission.BILLS_VIEW)
  getBill(@Param('billId') billId: string, @Request() req: { user: AuthUser }) {
    return this.billing.getBill(billId, req.user);
  }
}
