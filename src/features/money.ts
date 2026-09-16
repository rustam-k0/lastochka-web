import type { CartItem, Product } from "../entities/types";
export const money = (kopecks: number) =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: kopecks % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(kopecks / 100) + " ₽";
export function totals(cart: CartItem[], products: Product[], promo: boolean) {
  const subtotal = cart.reduce(
    (sum, row) =>
      sum +
      (products.find((p) => p.id === row.productId)?.price || 0) * row.quantity,
    0,
  );
  const discount = promo ? Math.round(subtotal * 0.1) : 0;
  return { subtotal, discount, delivery: 0, total: subtotal - discount };
}
