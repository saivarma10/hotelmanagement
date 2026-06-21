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
import { TableStatus } from '@prisma/client';
import { TablesService } from './tables.service';
import { JwtAuthGuard, AuthUser } from '../common/auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { RequirePermissions } from '../common/roles.decorator';
import { Permission } from '../common/permissions';
import { CreateAreaDto, CreateTableDto } from './tables.dto';
import { IsEnum } from 'class-validator';

class UpdateTableStatusDto {
  @IsEnum(TableStatus)
  status!: TableStatus;
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TablesController {
  constructor(private tables: TablesService) {}

  @Get('outlets/:outletId/floor')
  @RequirePermissions(Permission.FLOOR_VIEW)
  getFloorPlan(@Param('outletId') outletId: string, @Request() req: { user: AuthUser }) {
    return this.tables.getFloorPlan(outletId, req.user);
  }

  @Post('outlets/:outletId/areas')
  @RequirePermissions(Permission.SETUP_MANAGE)
  createArea(
    @Param('outletId') outletId: string,
    @Body() dto: CreateAreaDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.tables.createArea(outletId, req.user, dto);
  }

  @Post('areas/:areaId/tables')
  @RequirePermissions(Permission.SETUP_MANAGE)
  createTable(
    @Param('areaId') areaId: string,
    @Body() dto: CreateTableDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.tables.createTable(areaId, req.user, dto);
  }

  @Get('tables/:tableId')
  @RequirePermissions(Permission.FLOOR_VIEW)
  getTable(@Param('tableId') tableId: string, @Request() req: { user: AuthUser }) {
    return this.tables.getTableWithOrder(tableId, req.user);
  }

  @Patch('tables/:tableId/status')
  @RequirePermissions(Permission.ORDERS_MANAGE)
  updateStatus(
    @Param('tableId') tableId: string,
    @Body() dto: UpdateTableStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.tables.updateTableStatus(tableId, dto.status, req.user);
  }
}
