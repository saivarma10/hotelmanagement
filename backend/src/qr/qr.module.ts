import { Module } from '@nestjs/common';
import { QrMenuService } from './qr-menu.service';
import { QrAdminService } from './qr-admin.service';
import { PublicMenuController } from './public-menu.controller';
import { QrAdminController } from './qr-admin.controller';
import { OutletsModule } from '../outlets/outlets.module';

@Module({
  imports: [OutletsModule],
  controllers: [PublicMenuController, QrAdminController],
  providers: [QrMenuService, QrAdminService],
})
export class QrModule {}
