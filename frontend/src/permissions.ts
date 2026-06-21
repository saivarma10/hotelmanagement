export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'CAPTAIN' | 'KITCHEN';

export type Permission =
  | 'setup.manage'
  | 'staff.manage'
  | 'floor.view'
  | 'orders.manage'
  | 'billing.manage'
  | 'bills.view'
  | 'kitchen.view'
  | 'reports.view';

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'Owner / Admin',
  MANAGER: 'Manager',
  CASHIER: 'Cashier / Biller',
  CAPTAIN: 'Waiter / Captain',
  KITCHEN: 'Kitchen Staff',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  OWNER: 'Full access — setup, staff, billing, reports',
  MANAGER: 'Setup, floor, billing, reports (no staff management)',
  CASHIER: 'Floor, orders, billing, bill history',
  CAPTAIN: 'Floor and orders only (no billing)',
  KITCHEN: 'Kitchen display only',
};

export const STAFF_ROLES: UserRole[] = ['MANAGER', 'CASHIER', 'CAPTAIN', 'KITCHEN'];

export function hasPermission(user: { permissions?: Permission[] } | null, perm: Permission): boolean {
  return user?.permissions?.includes(perm) ?? false;
}

export function getDefaultRoute(role?: string): string {
  if (role === 'KITCHEN') return '/kitchen';
  return '/';
}

/** First non-kitchen screen for "Back to POS" from KDS */
export function getPosHomeRoute(user: { permissions?: Permission[] } | null): string | null {
  if (!user) return null;
  if (hasPermission(user, 'floor.view')) return '/';
  if (hasPermission(user, 'bills.view')) return '/bills';
  if (hasPermission(user, 'reports.view')) return '/reports';
  if (hasPermission(user, 'setup.manage')) return '/setup';
  return null;
}

export function canPinSwitch(role?: string): boolean {
  return ['OWNER', 'MANAGER', 'CASHIER', 'CAPTAIN'].includes(role ?? '');
}
