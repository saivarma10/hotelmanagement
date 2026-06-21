import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay } from '../common/money.util';

@Injectable()
export class CounterService {
  constructor(private prisma: PrismaService) {}

  private today() {
    return startOfDay(new Date());
  }

  async nextOrderNumber(outletId: string): Promise<number> {
    const date = this.today();
    const counter = await this.prisma.dailyCounter.upsert({
      where: { outletId_date: { outletId, date } },
      create: { outletId, date, orders: 1 },
      update: { orders: { increment: 1 } },
    });
    return counter.orders;
  }

  async nextBillNumber(outletId: string): Promise<number> {
    const date = this.today();
    const counter = await this.prisma.dailyCounter.upsert({
      where: { outletId_date: { outletId, date } },
      create: { outletId, date, bills: 1 },
      update: { bills: { increment: 1 } },
    });
    return counter.bills;
  }

  async nextKotNumber(outletId: string): Promise<number> {
    const date = this.today();
    const counter = await this.prisma.dailyCounter.upsert({
      where: { outletId_date: { outletId, date } },
      create: { outletId, date, kots: 1 },
      update: { kots: { increment: 1 } },
    });
    return counter.kots;
  }
}
