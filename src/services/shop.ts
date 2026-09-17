import { images } from "../data/manifest";
import { promotionCode } from "../data/checkout";
import type {
  Product,
  Category,
  Collection,
  Order,
  Notification,
  LoyaltyAccount,
  Promotion,
  CreateOrderInput,
} from "../entities/types";
export { pickupPoints } from "../data/checkout";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api" + url, {
      credentials: "same-origin",
      ...init,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      "Не удалось связаться с сервером. Проверьте соединение и повторите попытку.",
    );
  }
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Сервис временно недоступен.");
  return data as T;
}
type CatalogData = {
  products: Product[];
  categories: Category[];
  collections: Collection[];
};
let data: CatalogData = { products: [], categories: [], collections: [] };
let version = 0;
const listeners = new Set<() => void>();
export const catalog = {
  products: () => data.products,
  product: (id: string) => data.products.find((p) => p.id === id),
  categories: () => data.categories,
  collections: () => data.collections,
  subscribe: (callback: () => void) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },
  snapshot: () => version,
  async load() {
    data = await api<CatalogData>("/catalog");
    version += 1;
    listeners.forEach((callback) => callback());
    return data;
  },
  async availability(_location: string) {
    return (await catalog.load()).products;
  },
};
export const normalize = (v: string) =>
  v.toLocaleLowerCase("ru").replaceAll("ё", "е").trim();
export function searchProducts(query: string) {
  const q = normalize(query);
  return catalog
    .products()
    .filter((p) =>
      normalize(
        p.name +
          " " +
          (catalog.categories().find((c) => c.id === p.categoryId)?.name || ""),
      ).includes(q),
    );
}
export const assets = { swallow: images.swallow, logo: images.logo };
export const loyalty: LoyaltyAccount = {
  balance: 0,
  code: "LASTOCHKA-DEMO-0001",
};
export const notifications: Notification[] = [];
export const promotion: Promotion = {
  code: promotionCode,
  percent: 10,
  description:
    "Тестовая скидка 10% на товары. Применяется один раз, без суммирования с другими акциями.",
};

const pendingKey = "lastochka-pending-order";
export const checkout = {
  slots: (mode: string) =>
    api<{ id: string; date: string; label: string }[]>(
      "/slots?mode=" + encodeURIComponent(mode),
    ),
  orders: () => api<Order[]>("/orders"),
  hasPending(input: CreateOrderInput) {
    try {
      const pending = JSON.parse(sessionStorage.getItem(pendingKey) || "null");
      return pending?.fingerprint === JSON.stringify(input);
    } catch {
      return false;
    }
  },
  async createOrder(input: CreateOrderInput) {
    const fingerprint = JSON.stringify(input);
    let pending: { fingerprint: string; idempotencyKey: string } | null = null;
    try {
      pending = JSON.parse(sessionStorage.getItem(pendingKey) || "null");
    } catch {
      /* Replace malformed draft metadata. */
    }
    if (!pending || pending.fingerprint !== fingerprint) {
      pending = { fingerprint, idempotencyKey: crypto.randomUUID() };
      sessionStorage.setItem(pendingKey, JSON.stringify(pending));
    }
    return api<Order>("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        idempotencyKey: pending.idempotencyKey,
      }),
    });
  },
  clearPending: () => sessionStorage.removeItem(pendingKey),
};
