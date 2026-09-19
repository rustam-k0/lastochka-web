'use client';

let cachedCsrfToken = '';

export interface BrowserSessionData {
  authenticated: boolean;
  csrf: string;
  storeId: number;
  checkoutEnabled: boolean;
  publicOrigin: string;
}

export function paymentReturnUrl(path: string, publicOrigin: string): string {
  const origin = new URL(publicOrigin);
  if (!/^https?:$/.test(origin.protocol)) throw new Error('Не настроен безопасный адрес возврата');
  return new URL(path, `${origin.origin}/`).toString();
}

export async function browserSession(): Promise<BrowserSessionData> {
  const response = await fetch('/api/session', { cache: 'no-store' });
  const data = await response.json();
  cachedCsrfToken = data.csrf;
  return data;
}

export async function request<T = any>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  if (method !== 'GET' && !cachedCsrfToken) {
    await browserSession();
  }

  const url = path.startsWith('/api/') ? path : `/api/shop/${path}`;
  const headers: Record<string, string> = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(method !== 'GET' ? { 'x-csrf-token': cachedCsrfToken } : {}),
  };

  const response = await fetch(url, {
    method,
    cache: 'no-store',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (data?.csrf) {
    cachedCsrfToken = data.csrf;
  }

  if (!response.ok) {
    const fields = data?.errors ? Object.values(data.errors).flat().join(' ') : '';
    const message =
      [data?.message, fields].filter(Boolean).join(' ') || 'Не удалось выполнить запрос';
    throw Object.assign(new Error(message), { status: response.status, data });
  }

  return data as T;
}
