'use client';

/**
 * Browser-facing auth helpers. The session lives in an httpOnly cookie, so
 * the client never touches the token — it only sends credentials along and
 * asks /auth/me who it is.
 */

const BASE = `${
  process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:5000'
}/api/v1`;

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        // CSRF defense-in-depth: custom header required by the API for
        // cookie-authenticated mutations (§12).
        'x-csrf-token': '1',
        ...init?.headers,
      },
      ...init,
    });
  } catch {
    throw new AuthError(503, 'API_UNREACHABLE', 'Authentication service is unreachable');
  }
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const err = body as { code?: string; message?: string } | null;
    throw new AuthError(res.status, err?.code ?? `HTTP_${res.status}`, err?.message ?? res.statusText);
  }
  return body as T;
}

export const authApi = {
  register: (input: { email: string; password: string; fullName: string }) =>
    request<{ ok: boolean }>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),

  login: async (input: { email: string; password: string }): Promise<AuthUser> => {
    const res = await request<{ user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.user;
  },

  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  logoutAll: () => request<{ ok: boolean }>('/auth/logout-all', { method: 'POST' }),
  me: async (): Promise<AuthUser | null> => {
    try {
      const res = await request<{ user: AuthUser | null }>('/auth/me');
      return res.user ?? null;
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return null;
      throw err;
    }
  },

  forgotPassword: (email: string) =>
    request<{ ok?: boolean; devToken?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (input: { token: string; password: string }) =>
    request<{ ok: boolean }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(input) }),

  verifyEmail: (token: string) =>
    request<{ ok: boolean }>(`/auth/verify-email?token=${encodeURIComponent(token)}`),

  resendVerification: (email: string) =>
    request<{ ok: boolean }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};

/** Server-cart merge at login (§9.1). Failures never block the login UX. */
export async function mergeGuestCart(items: { variantId: string; quantity: number }[]): Promise<boolean> {
  if (items.length === 0) return true;
  try {
    await request('/cart/merge', { method: 'POST', body: JSON.stringify({ items }) });
    return true;
  } catch {
    return false;
  }
}
