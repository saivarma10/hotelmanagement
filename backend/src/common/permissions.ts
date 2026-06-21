import { UserRole } from '@prisma/client';

/** Petpooja-style permission keys */
export enum Permission {
  SETUP_MANAGE = 'setup.manage',
  STAFF_MANAGE = 'staff.manage',
  FLOOR_VIEW = 'floor.view',
  ORDERS_MANAGE = 'orders.manage',
  BILLING_MANAGE = 'billing.manage',
  BILLS_VIEW = 'bills.view',
  KITCHEN_VIEW = 'kitchen.view',
  REPORTS_VIEW = 'reports.view',
}

const ALL: Permission[] = Object.values(Permission);

/** Role → permissions (Petpooja-style templates) */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: ALL,
  MANAGER: [
    Permission.SETUP_MANAGE,
    Permission.FLOOR_VIEW,
    Permission.ORDERS_MANAGE,
    Permission.BILLING_MANAGE,
    Permission.BILLS_VIEW,
    Permission.KITCHEN_VIEW,
    Permission.REPORTS_VIEW,
  ],
  CASHIER: [
    Permission.FLOOR_VIEW,
    Permission.ORDERS_MANAGE,
    Permission.BILLING_MANAGE,
    Permission.BILLS_VIEW,
  ],
  CAPTAIN: [Permission.FLOOR_VIEW, Permission.ORDERS_MANAGE],
  KITCHEN: [Permission.KITCHEN_VIEW],
};

export function roleHasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as UserRole];
  return perms?.includes(permission) ?? false;
}

export function roleInList(role: string, allowed: UserRole[]): boolean {
  return allowed.includes(role as UserRole);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'Owner / Admin',
  MANAGER: 'Manager',
  CASHIER: 'Cashier / Biller',
  CAPTAIN: 'Waiter / Captain',
  KITCHEN: 'Kitchen Staff',
};
