import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { OutletsModule } from '../outlets/outlets.module';
import { CounterService } from '../common/counter.service';

@Module({
  imports: [OutletsModule],
  controllers: [BillingController],
  providers: [BillingService, CounterService],
})
export class BillingModule {}
