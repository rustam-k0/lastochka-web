import type { CartItem, Product, Fulfillment } from "../entities/types";
export function validateCheckout(
  cart: CartItem[],
  products: Product[],
  fulfillment: Fulfillment,
  destination: string,
  consent: boolean,
) {
  const errors: Record<string, string> = {};
  if (!cart.length) errors.cart = "Добавьте товары в корзину.";
  if (
    cart.some((row) => {
      const p = products.find((p) => p.id === row.productId);
      return (
        !p ||
        !Number.isInteger(row.quantity) ||
        row.quantity < 1 ||
        row.quantity > p.stock
      );
    })
  )
    errors.cart = "Количество товара недоступно. Проверьте корзину.";
  if (!destination)
    errors.destination =
      fulfillment.mode === "delivery"
        ? "Укажите адрес доставки."
        : "Выберите пункт самовывоза.";
  if (
    !fulfillment.slot ||
    !fulfillment.slot.startsWith(fulfillment.mode + "|") ||
    Date.parse(fulfillment.slot.split("|")[1] + "T23:59:59") < Date.now()
  )
    errors.slot = "Выберите доступную дату и время.";
  if (!consent)
    errors.consent = "Для тестового заказа подтвердите согласие с условиями.";
  return errors;
}
