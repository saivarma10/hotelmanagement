import { Module } from '@nestjs/common';
import { OutletsService } from './outlets.service';
import { OutletsController } from './outlets.controller';
import { OutletAccessService } from '../common/outlet-access.service';

@Module({
  controllers: [OutletsController],
  providers: [OutletsService, OutletAccessService],
  exports: [OutletAccessService],
})
export class OutletsModule {}
