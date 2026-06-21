const TOKEN_KEY = 'pos_token';
const OUTLET_KEY = 'pos_outlet';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredOutletId(): string | null {
  return localStorage.getItem(OUTLET_KEY);
}

export function setStoredOutletId(id: string) {
  localStorage.setItem(OUTLET_KEY, id);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.message;
    const text = Array.isArray(msg) ? msg.join(', ') : msg || `Request failed (${res.status})`;
    throw new ApiError(text, res.status);
  }

  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: import('./types').User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: {
    organizationName: string;
    outletName: string;
    name: string;
    email: string;
    password: string;
  }) =>
    request<{ accessToken: string; user: import('./types').User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () =>
    request<{
      id: string;
      email: string;
      name: string;
      role: import('./types').UserRole;
      permissions: import('./permissions').Permission[];
      organization: { outlets: import('./types').Outlet[] };
    }>('/auth/me'),

  pinSwitch: (pin: string) =>
    request<{ accessToken: string; user: import('./types').User }>('/auth/pin-switch', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),

  listStaff: () => request<import('./types').StaffMember[]>('/users'),

  createStaff: (data: {
    name: string;
    email: string;
    password: string;
    role: import('./types').UserRole;
    pin?: string;
  }) =>
    request<import('./types').StaffMember>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStaff: (
    userId: string,
    data: {
      name?: string;
      role?: import('./types').UserRole;
      isActive?: boolean;
      pin?: string | null;
    },
  ) =>
    request<import('./types').StaffMember>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  resetStaffPassword: (userId: string, password: string) =>
    request<{ success: boolean }>(`/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  getOutlet: (outletId: string) =>
    request<import('./types').Outlet>(`/outlets/${outletId}`),

  updateOutlet: (
    outletId: string,
    data: {
      name?: string;
      address?: string;
      gstNumber?: string;
      gstRate?: number;
    },
  ) =>
    request<import('./types').Outlet>(`/outlets/${outletId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  createArea: (outletId: string, name: string) =>
    request<{ id: string; name: string }>(`/outlets/${outletId}/areas`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  createTable: (areaId: string, name: string, capacity = 4) =>
    request<{ id: string; name: string }>(`/areas/${areaId}/tables`, {
      method: 'POST',
      body: JSON.stringify({ name, capacity }),
    }),

  createCategory: (outletId: string, name: string) =>
    request<{ id: string; name: string }>(`/outlets/${outletId}/menu/categories`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  createMenuItem: (
    outletId: string,
    data: {
      name: string;
      price: number;
      categoryId: string;
      isVeg?: boolean;
      description?: string;
    },
  ) =>
    request(`/outlets/${outletId}/menu/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getFloor: (outletId: string) =>
    request<import('./types').Area[]>(`/outlets/${outletId}/floor`),

  getMenu: (outletId: string) =>
    request<{ categories: import('./types').Category[] }>(`/outlets/${outletId}/menu`),

  createOrder: (tableId: string, outletId: string) =>
    request<import('./types').Order>(`/orders/tables/${tableId}/outlets/${outletId}`, {
      method: 'POST',
    }),

  getOrder: (orderId: string) =>
    request<import('./types').Order>(`/orders/${orderId}`),

  addOrderItem: (
    orderId: string,
    data: {
      menuItemId: string;
      variationId?: string;
      quantity?: number;
      notes?: string;
      addonIds?: string[];
    },
  ) =>
    request<import('./types').Order>(`/orders/${orderId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeOrderItem: (orderItemId: string) =>
    request<import('./types').Order>(`/orders/items/${orderItemId}`, { method: 'DELETE' }),

  cancelOrderItem: (orderItemId: string) =>
    request<import('./types').Order>(`/orders/items/${orderItemId}/cancel`, { method: 'POST' }),

  getKitchenQueue: (outletId: string) =>
    request<import('./types').KitchenQueue>(`/outlets/${outletId}/kitchen`),

  markKitchenItemReady: (orderItemId: string) =>
    request<{ success: boolean }>(`/kitchen/items/${orderItemId}/ready`, { method: 'POST' }),

  markKotReady: (kotId: string) =>
    request<{ success: boolean; count: number }>(`/kitchen/kots/${kotId}/ready`, { method: 'POST' }),

  sendKot: (orderId: string, orderItemIds?: string[]) =>
    request<import('./types').KotPrintData>(`/orders/${orderId}/kot`, {
      method: 'POST',
      body: JSON.stringify({ orderItemIds }),
    }),

  previewBill: (orderId: string, discountPercent?: number, discountAmount?: number) => {
    const params = new URLSearchParams();
    if (discountPercent) params.set('discountPercent', String(discountPercent));
    if (discountAmount) params.set('discountAmount', String(discountAmount));
    const qs = params.toString();
    return request<import('./types').BillPreview>(
      `/billing/orders/${orderId}/preview${qs ? `?${qs}` : ''}`,
    );
  },

  settleBill: (
    orderId: string,
    data: {
      payments: Array<{ method: import('./types').PaymentMethod; amount: number; reference?: string }>;
      discountPercent?: number;
      discountAmount?: number;
    },
  ) =>
    request<import('./types').Bill>(`/billing/orders/${orderId}/settle`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getBill: (billId: string) =>
    request<import('./types').Bill>(`/billing/bills/${billId}`),

  listBills: (
    outletId: string,
    params: {
      date?: string;
      dateFrom?: string;
      dateTo?: string;
      paymentMethod?: import('./types').PaymentMethod;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.date) qs.set('date', params.date);
    if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params.dateTo) qs.set('dateTo', params.dateTo);
    if (params.paymentMethod) qs.set('paymentMethod', params.paymentMethod);
    if (params.search) qs.set('search', params.search);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return request<import('./types').BillsListResponse>(
      `/billing/outlets/${outletId}/bills${q ? `?${q}` : ''}`,
    );
  },

  getDayEndSummary: (outletId: string, date?: string) => {
    const qs = date ? `?date=${date}` : '';
    return request<import('./types').DayEndSummary>(
      `/billing/outlets/${outletId}/bills/day-end${qs}`,
    );
  },

  daySummary: (outletId: string, date?: string) => {
    const qs = date ? `?date=${date}` : '';
    return request<import('./types').DaySummary>(`/outlets/${outletId}/reports/day-summary${qs}`);
  },

  getQrMenu: (outletId: string) =>
    request<import('./types').QrMenuData>(`/outlets/${outletId}/qr-menu`),

  setQrMenuEnabled: (outletId: string, enabled: boolean) =>
    request<{ id: string; qrMenuEnabled: boolean }>(`/outlets/${outletId}/qr-menu`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
};
