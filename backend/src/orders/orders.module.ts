import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OutletsModule } from '../outlets/outlets.module';
import { CounterService } from '../common/counter.service';

@Module({
  imports: [OutletsModule],
  controllers: [OrdersController],
  providers: [OrdersService, CounterService],
  exports: [OrdersService],
})
export class OrdersModule {}
