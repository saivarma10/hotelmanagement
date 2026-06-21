export type PaymentMethod = 'CASH' | 'UPI' | 'CARD';

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'CAPTAIN' | 'KITCHEN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  permissions?: import('./permissions').Permission[];
}

export interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  pin: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Outlet {
  id: string;
  name: string;
  gstRate: number;
  address?: string | null;
  gstNumber?: string | null;
}

export interface TableInfo {
  id: string;
  name: string;
  capacity: number;
  status: 'VACANT' | 'OCCUPIED' | 'BILLING';
  activeOrder: { id: string; orderNumber: number; status: string } | null;
}

export interface Area {
  id: string;
  name: string;
  tables: TableInfo[];
}

export interface MenuVariation {
  id: string;
  name: string;
  price: number;
}

export interface MenuAddon {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  isVeg: boolean;
  variations: MenuVariation[];
  addons: MenuAddon[];
}

export interface Category {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  status: string;
  menuItem: { id: string; name: string; isVeg: boolean };
  variation: { id: string; name: string } | null;
  addons: { name: string; price: number }[];
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  status: string;
  table: { id: string; name: string; area: string };
  items: OrderItem[];
}

export interface KotPrintData {
  id: string;
  kotNumber: number;
  createdAt: string;
  table: string;
  area: string;
  orderNumber: number;
  items: Array<{
    name: string;
    variation?: string;
    quantity: number;
    notes?: string;
    addons: string[];
  }>;
}

export interface BillPreview {
  orderId: string;
  orderNumber: number;
  table: string;
  items: Array<{
    id: string;
    name: string;
    variation?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  taxRate: number;
  total: number;
  gstNumber?: string;
}

export interface Bill {
  id: string;
  billNumber: number;
  outletName: string;
  gstNumber?: string;
  table?: string;
  area?: string;
  orderNumber?: number;
  cashier?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  taxRate: number;
  total: number;
  payments: Array<{ method: PaymentMethod; amount: number; reference?: string }>;
  items?: BillPreview['items'];
  createdAt: string;
}

export interface BillListItem {
  id: string;
  billNumber: number;
  orderNumber: number;
  table: string;
  area: string;
  total: number;
  discountAmount: number;
  paymentMethod: PaymentMethod;
  paymentMethods: PaymentMethod[];
  cashier: string;
  createdAt: string;
  outletName: string;
}

export interface BillsListResponse {
  bills: BillListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: {
    billCount: number;
    totalSales: number;
    totalTax: number;
    totalDiscount: number;
    paymentBreakdown: Record<string, number>;
  };
  filters: {
    dateFrom: string;
    dateTo: string;
    paymentMethod: string | null;
    search: string | null;
  };
}

export interface DayEndSummary {
  date: string;
  billCount: number;
  totalSales: number;
  totalTax: number;
  totalDiscount: number;
  paymentBreakdown: Record<string, number>;
  billerWise: Array<{
    name: string;
    billCount: number;
    totalSales: number;
    payments: Record<string, number>;
  }>;
}

export interface KitchenTicket {
  id: string;
  kotNumber: number;
  createdAt: string;
  ageMinutes: number;
  orderNumber: number;
  table: string;
  area: string;
  items: Array<{
    id: string;
    name: string;
    variation?: string;
    quantity: number;
    notes?: string;
    addons: string[];
  }>;
}

export interface KitchenQueue {
  tickets: KitchenTicket[];
  aggregated: Array<{
    key: string;
    name: string;
    variation?: string;
    quantity: number;
    itemIds: string[];
  }>;
  pendingCount: number;
}

export interface DaySummary {
  date: string;
  billCount: number;
  orderCount: number;
  cancelledOrders: number;
  totalSales: number;
  totalTax: number;
  totalDiscount: number;
  paymentBreakdown: Record<string, number>;
  itemWise: Array<{ name: string; quantity: number; revenue: number }>;
}

export interface GuestMenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  isVeg: boolean;
  variations: Array<{ id: string; name: string; price: number }>;
  addons: Array<{ id: string; name: string; price: number }>;
}

export interface GuestMenuCategory {
  id: string;
  name: string;
  items: GuestMenuItem[];
}

export interface GuestMenu {
  outlet: { name: string; address?: string | null };
  table: { name: string; area: string };
  viewOnly: boolean;
  categories: GuestMenuCategory[];
}

export interface QrMenuTable {
  id: string;
  name: string;
  qrToken: string;
}

export interface QrMenuData {
  qrMenuEnabled: boolean;
  outletName: string;
  areas: Array<{ id: string; name: string; tables: QrMenuTable[] }>;
}
