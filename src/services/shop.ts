import { categories, collections, products } from "../data/catalog";
import { images } from "../data/manifest";
import type {
  Product,
  Category,
  Collection,
  Order,
  Notification,
  LoyaltyAccount,
  Promotion,
} from "../entities/types";
export interface CatalogService {
  products(): Product[];
  product(id: string): Product | undefined;
  categories(): Category[];
  collections(): Collection[];
  availability(location: string): Promise<Product[]>;
}
export const catalog: CatalogService = {
  products: () => products,
  product: (id) => products.find((p) => p.id === id),
  categories: () => categories,
  collections: () => collections,
  availability: async () => products.map((p) => ({ ...p })),
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
  code: "ЛАСТОЧКА10",
  percent: 10,
  description:
    "Тестовая скидка 10% на товары. Применяется один раз, без суммирования с другими акциями.",
};
export const pickupPoints = [
  {
    id: "kalinina",
    name: "Ласточка Джами",
    address: "Нальчик, ул. Калинина, 76",
  },
];
export interface CheckoutService {
  slots(mode: string): Promise<{ id: string; date: string; label: string }[]>;
  createOrder(order: Order): Promise<Order>;
}
export const checkout: CheckoutService = {
  slots: async (mode) =>
    Array.from({ length: 3 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      const date = d.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      });
      return ["10:00–12:00", "12:00–14:00", "16:00–18:00"].map((label) => ({
        id: mode + "|" + d.toISOString().slice(0, 10) + "|" + label,
        date,
        label,
      }));
    }).flat(),
  createOrder: async (order) => {
    await new Promise((r) => setTimeout(r, 350));
    return structuredClone(order);
  },
};
