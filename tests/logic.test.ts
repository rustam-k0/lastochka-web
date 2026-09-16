import { describe, it, expect } from "vitest";
import { totals } from "../src/features/money";
import { validateCheckout } from "../src/features/checkout";
import { catalog, searchProducts } from "../src/services/shop";
const products = catalog.products();
const cart = ["raspberry", "khychin-potato", "khychin-cheese", "yogurt"].map(
  (productId) => ({ productId, quantity: 1 }),
);
describe("Деньги", () => {
  it("согласует сумму четырёх товаров из референса", () =>
    expect(totals(cart, products, false)).toEqual({
      subtotal: 103740,
      discount: 0,
      delivery: 0,
      total: 103740,
    }));
  it("округляет скидку в копейках единожды", () =>
    expect(totals(cart, products, true).total).toBe(93366));
  it("корректно считает количества и пустую корзину", () => {
    expect(
      totals([{ productId: "yogurt", quantity: 3 }], products, false).total,
    ).toBe(29520);
    expect(totals([], products, true).total).toBe(0);
  });
});
describe("Оформление", () => {
  const future = new Date();
  future.setDate(future.getDate() + 1);
  const slot = "delivery|" + future.toISOString().slice(0, 10) + "|10:00–12:00";
  it("принимает заполненный заказ", () =>
    expect(
      validateCheckout(
        cart,
        products,
        { mode: "delivery", pickupId: "", slot },
        "Адрес",
        true,
      ),
    ).toEqual({}));
  it("проверяет получение, время и согласие", () => {
    expect(
      Object.keys(
        validateCheckout(
          cart,
          products,
          { mode: "pickup", pickupId: "", slot },
          "",
          false,
        ),
      ).sort(),
    ).toEqual(["consent", "destination", "slot"]);
  });
  it("блокирует некорректное количество и отсутствующий товар", () => {
    for (const row of [
      { productId: "raspberry", quantity: 13 },
      { productId: "unknown", quantity: 1 },
      { productId: "yogurt", quantity: 0.5 },
    ])
      expect(
        validateCheckout(
          [row],
          products,
          { mode: "delivery", pickupId: "", slot },
          "Адрес",
          true,
        ).cart,
      ).toBeTruthy();
  });
  it("не принимает прошлую дату", () =>
    expect(
      validateCheckout(
        cart,
        products,
        {
          mode: "delivery",
          pickupId: "",
          slot: "delivery|2020-01-01|10:00–12:00",
        },
        "Адрес",
        true,
      ).slot,
    ).toBeTruthy());
});
it("поиск не зависит от регистра и ё", () => {
  expect(searchProducts("ХЫЧИН")).toHaveLength(2);
  expect(searchProducts("соленые").map((x) => x.id)).toContain("pickles");
});
