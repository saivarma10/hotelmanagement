import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { OutletsModule } from '../outlets/outlets.module';

@Module({
  imports: [OutletsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
