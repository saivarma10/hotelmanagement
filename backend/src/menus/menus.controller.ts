import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MenusService } from './menus.service';
import { JwtAuthGuard, AuthUser } from '../common/auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { RequirePermissions } from '../common/roles.decorator';
import { Permission } from '../common/permissions';
import {
  CreateCategoryDto,
  CreateMenuItemDto,
  CreateAddonDto,
  UpdateMenuItemDto,
} from './menus.dto';

@Controller('outlets/:outletId/menu')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MenusController {
  constructor(private menus: MenusService) {}

  @Get()
  @RequirePermissions(Permission.ORDERS_MANAGE)
  getMenu(@Param('outletId') outletId: string, @Request() req: { user: AuthUser }) {
    return this.menus.getFullMenu(outletId, req.user);
  }

  @Post('categories')
  @RequirePermissions(Permission.SETUP_MANAGE)
  createCategory(
    @Param('outletId') outletId: string,
    @Body() dto: CreateCategoryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.menus.createCategory(outletId, req.user, dto);
  }

  @Post('items')
  @RequirePermissions(Permission.SETUP_MANAGE)
  createItem(
    @Param('outletId') outletId: string,
    @Body() dto: CreateMenuItemDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.menus.createMenuItem(outletId, req.user, dto);
  }

  @Post('addons')
  @RequirePermissions(Permission.SETUP_MANAGE)
  createAddon(
    @Param('outletId') outletId: string,
    @Body() dto: CreateAddonDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.menus.createAddon(outletId, req.user, dto);
  }

  @Patch('items/:itemId')
  @RequirePermissions(Permission.SETUP_MANAGE)
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMenuItemDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.menus.updateMenuItem(itemId, req.user, dto);
  }
}
