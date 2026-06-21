import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard, AuthUser } from '../common/auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { RequirePermissions } from '../common/roles.decorator';
import { Permission } from '../common/permissions';

@Controller('outlets/:outletId/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('day-summary')
  @RequirePermissions(Permission.REPORTS_VIEW)
  daySummary(
    @Param('outletId') outletId: string,
    @Query('date') date: string | undefined,
    @Request() req: { user: AuthUser },
  ) {
    return this.reports.daySummary(outletId, req.user, date);
  }
}
