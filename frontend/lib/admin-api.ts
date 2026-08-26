'use client';

const BASE = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/v1`;

export class AdminError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
        'x-csrf-token': '1',
        ...init?.headers,
      },
    });
  } catch {
    throw new AdminError(503, 'API_UNREACHABLE', 'Admin service is unreachable');
  }
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const err = body as { code?: string; message?: string } | null;
    throw new AdminError(res.status, err?.code ?? `HTTP_${res.status}`, err?.message ?? res.statusText);
  }
  return body as T;
}

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardData {
  revenueCents: number;
  ordersByStatus: Record<string, number>;
  lowStock: {
    variantId: string;
    sku: string;
    productName: string;
    stockOnHand: number;
    reserved: number;
  }[];
  recentOrders: {
    orderNumber: string;
    status: string;
    totalCents: number;
    createdAt: string;
    contactEmail: string;
  }[];
}

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  contactEmail: string;
  itemCount: number;
}

export interface OrderListResult {
  items: AdminOrderRow[];
  meta: PageMeta;
}

export type OrderTransitionTarget = 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderEvent {
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorType: string;
  message: string | null;
  createdAt: string;
}

export interface OrderDetail {
  orderNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  contactEmail: string;
  shippingAddress: Record<string, string>;
  items: {
    productName: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    totalCents: number;
  }[];
  events: OrderEvent[];
  payments: { status: string }[];
}

export interface AdminCustomerRow {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
}

export interface CustomerListResult {
  items: AdminCustomerRow[];
  meta: PageMeta;
}

export interface CustomerDetail {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  orders: { orderNumber: string; status: string; totalCents: number; createdAt: string }[];
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotalCents?: number | null;
  maxDiscountCents?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  timesUsed: number;
}

export type CouponCreateInput = Omit<Coupon, 'id' | 'timesUsed'>;

export interface CouponListResult {
  items: Coupon[];
  meta: PageMeta;
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string;
  diff: unknown;
  ip: string | null;
  createdAt: string;
}

export interface AuditLogResult {
  items: AuditEntry[];
  meta: PageMeta;
}

export interface AdminProductRow {
  id: string;
  slug?: string | null;
  name?: string | null;
  status?: string | null;
  priceFromCents?: number | null;
  [key: string]: unknown;
}

export interface ProductImageInput {
  url: string;
  mediaId?: string;
  altText?: string;
  isPrimary?: boolean;
}

export interface ProductImageRow {
  id: string;
  url: string;
  mediaId: string | null;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface AdminProductDetail extends AdminProductRow {
  description?: string | null;
  images?: ProductImageRow[];
}

export interface ProductUpdateInput {
  name?: string;
  description?: string;
  status?: 'draft' | 'active' | 'archived';
}

export interface ProductCreateInput {
  name: string;
  description?: string;
  categoryId?: string;
  animeId?: string | null;
  characterId?: string | null;
  status?: 'draft' | 'active' | 'archived';
  featured?: boolean;
  price?: string;
  compareAtPrice?: string;
  stock?: string;
}

export const adminApi = {
  getDashboard: () => request<DashboardData>('/admin/dashboard'),

  listOrders: (params: { status?: string; q?: string; page?: number } = {}) =>
    request<OrderListResult>(withQuery('/admin/orders', params)),

  getOrder: (orderNumber: string) =>
    request<OrderDetail>(`/admin/orders/${encodeURIComponent(orderNumber)}`),

  transitionOrder: (
    orderNumber: string,
    body: { to: OrderTransitionTarget; note?: string },
  ) =>
    request<unknown>(`/admin/orders/${encodeURIComponent(orderNumber)}/transition`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listCustomers: (params: { q?: string; page?: number } = {}) =>
    request<CustomerListResult>(withQuery('/admin/customers', params)),

  getCustomer: (id: string) =>
    request<CustomerDetail>(`/admin/customers/${encodeURIComponent(id)}`),

  banCustomer: (id: string, reason: string) =>
    request<unknown>(`/admin/customers/${encodeURIComponent(id)}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  adjustInventory: (body: { variantId: string; delta: number; reason: string }) =>
    request<{ variantId: string; stockOnHand: number }>('/admin/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listCoupons: (page?: number) =>
    request<CouponListResult>(withQuery('/admin/coupons', { page })),

  createCoupon: (body: CouponCreateInput) =>
    request<Coupon>('/admin/coupons', { method: 'POST', body: JSON.stringify(body) }),

  updateCoupon: (
    id: string,
    patch: { isActive?: boolean; endsAt?: string | null; usageLimit?: number | null },
  ) =>
    request<unknown>(`/admin/coupons/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  listAuditLog: (page?: number) =>
    request<AuditLogResult>(withQuery('/admin/audit-log', { page })),

  listProducts: (params: { q?: string; page?: number } = {}) =>
    request<{ items: AdminProductRow[]; meta: PageMeta }>(
      withQuery('/admin/products', params),
    ),

  getProduct: (id: string) =>
    request<AdminProductDetail>(`/admin/products/${encodeURIComponent(id)}`),

  updateProduct: (id: string, body: ProductUpdateInput) =>
    request<unknown>(`/admin/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  createProduct: (body: ProductCreateInput) =>
    request<{ id: string; slug: string }>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  createAnime: (name: string) =>
    request<{ id: string; slug: string; name: string }>('/admin/animes', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  createCharacter: (name: string) =>
    request<{ id: string; slug: string; name: string }>('/admin/characters', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  uploadMedia: (file: File, folder: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);
    return request<{ id: string; url: string }>('/admin/media', {
      method: 'POST',
      body: form,
    } as RequestInit);
  },

  setProductImages: (id: string, images: ProductImageInput[]) =>
    request<{ images: ProductImageRow[] }>(
      `/admin/products/${encodeURIComponent(id)}/images`,
      { method: 'PUT', body: JSON.stringify({ images }) },
    ),

  listQueues: () => request<QueueInfo[]>('/admin/queues'),

  listFailedJobs: (queue: string, page?: number) =>
    request<FailedJobsResult>(
      withQuery(`/admin/queues/${encodeURIComponent(queue)}/failed`, { page }),
    ),

  requeueFailedJob: (queue: string, jobId: string) =>
    request<unknown>(
      `/admin/queues/${encodeURIComponent(queue)}/failed/${encodeURIComponent(jobId)}/requeue`,
      { method: 'POST' },
    ),
};

export interface QueueCounts {
  completed: number;
  failed: number;
  active: number;
  waiting: number;
  delayed: number;
}

export interface QueueInfo {
  name: string;
  counts: QueueCounts;
  dlqCount: number;
}

export interface FailedJob {
  id: string;
  name: string;
  failedReason: string;
  attemptsMade: number;
  timestamp: number;
}

export interface FailedJobsResult {
  items: FailedJob[];
  meta: PageMeta;
}
