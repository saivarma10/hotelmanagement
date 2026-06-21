import { Controller, Get, Param } from '@nestjs/common';
import { QrMenuService } from './qr-menu.service';

@Controller('public/menu')
export class PublicMenuController {
  constructor(private qrMenu: QrMenuService) {}

  @Get(':qrToken')
  getMenu(@Param('qrToken') qrToken: string) {
    return this.qrMenu.getPublicMenu(qrToken);
  }
}
