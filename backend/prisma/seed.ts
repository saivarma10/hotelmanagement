import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const org = await prisma.organization.upsert({
    where: { id: 'seed-org' },
    update: {},
    create: { id: 'seed-org', name: 'Demo Hotel Group' },
  });

  const outlet = await prisma.outlet.upsert({
    where: { id: 'seed-outlet' },
    update: {},
    create: {
      id: 'seed-outlet',
      name: 'Main Restaurant',
      address: '123 Hotel Street, Mumbai',
      gstNumber: '27AAAAA0000A1Z5',
      gstRate: 5,
      organizationId: org.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { pin: '0000' },
    create: {
      email: 'admin@demo.com',
      name: 'Demo Admin',
      passwordHash,
      role: 'OWNER',
      pin: '0000',
      organizationId: org.id,
    },
  });

  const demoStaff = [
    { email: 'manager@demo.com', name: 'Demo Manager', role: 'MANAGER' as const, pin: '1111' },
    { email: 'cashier@demo.com', name: 'Demo Cashier', role: 'CASHIER' as const, pin: '2222' },
    { email: 'waiter@demo.com', name: 'Demo Waiter', role: 'CAPTAIN' as const, pin: '3333' },
    { email: 'kitchen@demo.com', name: 'Demo Chef', role: 'KITCHEN' as const, pin: '4444' },
  ];

  for (const s of demoStaff) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: { pin: s.pin, role: s.role },
      create: {
        email: s.email,
        name: s.name,
        passwordHash,
        role: s.role,
        pin: s.pin,
        organizationId: org.id,
      },
    });
  }

  const areaMain = await prisma.area.upsert({
    where: { id: 'seed-area-main' },
    update: {},
    create: { id: 'seed-area-main', name: 'Main Hall', outletId: outlet.id, sortOrder: 0 },
  });

  const areaTerrace = await prisma.area.upsert({
    where: { id: 'seed-area-terrace' },
    update: {},
    create: { id: 'seed-area-terrace', name: 'Terrace', outletId: outlet.id, sortOrder: 1 },
  });

  const tableNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
  for (let i = 0; i < tableNames.length; i++) {
    const areaId = i < 4 ? areaMain.id : areaTerrace.id;
    await prisma.table.upsert({
      where: { areaId_name: { areaId, name: tableNames[i] } },
      update: {},
      create: { name: tableNames[i], capacity: 4, areaId },
    });
  }

  const catStarters = await prisma.category.upsert({
    where: { id: 'seed-cat-starters' },
    update: {},
    create: { id: 'seed-cat-starters', name: 'Starters', outletId: outlet.id, sortOrder: 0 },
  });

  const catMain = await prisma.category.upsert({
    where: { id: 'seed-cat-main' },
    update: {},
    create: { id: 'seed-cat-main', name: 'Main Course', outletId: outlet.id, sortOrder: 1 },
  });

  const catBeverages = await prisma.category.upsert({
    where: { id: 'seed-cat-beverages' },
    update: {},
    create: { id: 'seed-cat-beverages', name: 'Beverages', outletId: outlet.id, sortOrder: 2 },
  });

  const extraCheese = await prisma.addon.upsert({
    where: { id: 'seed-addon-cheese' },
    update: {},
    create: { id: 'seed-addon-cheese', name: 'Extra Cheese', price: 30, outletId: outlet.id },
  });

  const extraPaneer = await prisma.addon.upsert({
    where: { id: 'seed-addon-paneer' },
    update: {},
    create: { id: 'seed-addon-paneer', name: 'Extra Paneer', price: 50, outletId: outlet.id },
  });

  await prisma.menuItem.upsert({
    where: { id: 'seed-item-paneer-tikka' },
    update: {},
    create: {
      id: 'seed-item-paneer-tikka',
      name: 'Paneer Tikka',
      description: 'Grilled cottage cheese with spices',
      price: 220,
      isVeg: true,
      categoryId: catStarters.id,
      addons: { create: [{ addonId: extraCheese.id }] },
    },
  });

  await prisma.menuItem.upsert({
    where: { id: 'seed-item-chicken-tikka' },
    update: {},
    create: {
      id: 'seed-item-chicken-tikka',
      name: 'Chicken Tikka',
      description: 'Tandoor grilled chicken',
      price: 280,
      isVeg: false,
      categoryId: catStarters.id,
    },
  });

  const dalItem = await prisma.menuItem.upsert({
    where: { id: 'seed-item-dal' },
    update: {},
    create: {
      id: 'seed-item-dal',
      name: 'Dal Makhani',
      price: 180,
      isVeg: true,
      categoryId: catMain.id,
      variations: {
        create: [
          { name: 'Regular', price: 180 },
          { name: 'Large', price: 280 },
        ],
      },
      addons: { create: [{ addonId: extraPaneer.id }] },
    },
  });

  await prisma.menuItem.upsert({
    where: { id: 'seed-item-biryani' },
    update: {},
    create: {
      id: 'seed-item-biryani',
      name: 'Hyderabadi Biryani',
      price: 320,
      isVeg: false,
      categoryId: catMain.id,
      variations: {
        create: [
          { name: 'Half', price: 320 },
          { name: 'Full', price: 520 },
        ],
      },
    },
  });

  await prisma.menuItem.upsert({
    where: { id: 'seed-item-lassi' },
    update: {},
    create: {
      id: 'seed-item-lassi',
      name: 'Sweet Lassi',
      price: 80,
      isVeg: true,
      categoryId: catBeverages.id,
    },
  });

  await prisma.menuItem.upsert({
    where: { id: 'seed-item-tea' },
    update: {},
    create: {
      id: 'seed-item-tea',
      name: 'Masala Chai',
      price: 40,
      isVeg: true,
      categoryId: catBeverages.id,
    },
  });

  console.log('Seed complete.');
  console.log('Login: admin@demo.com / password123');
  console.log('Outlet ID:', outlet.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
