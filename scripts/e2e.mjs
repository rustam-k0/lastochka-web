import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
fs.mkdirSync("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const go = (path) => page.goto("http://localhost:5173" + path);
await go("/?demo");
await page.getByRole("button", { name: "Загрузить демоданные" }).click();
await expect(page.getByRole("link", { name: /Корзина, 1/ })).toBeVisible();
for (const route of [
  "",
  "catalog",
  "favorites",
  "profile",
  "cart",
  "notifications",
]) {
  await go("/" + route);
  await page.screenshot({
    path: "artifacts/" + (route || "home") + ".png",
    fullPage: true,
  });
}
await go("/search");
await page.getByRole("textbox", { name: "Поиск товаров" }).fill("ХЫЧИН");
await expect(page.getByText("Найдено товаров: 2")).toBeVisible();
await page
  .getByRole("button", { name: /В избранное: Хычин Балкарский Карт/ })
  .click();
await go("/favorites");
await expect(
  page.getByText("Хычин Балкарский Карт/сыр Ласточка"),
).toBeVisible();
await page.reload();
await expect(
  page.getByText("Хычин Балкарский Карт/сыр Ласточка"),
).toBeVisible();
await page.getByRole("button", { name: /Удалить из избранного/ }).click();
await expect(page.getByText("Любимые товары отобразятся здесь")).toBeVisible();
await go("/cart");
await page.getByRole("button", { name: "Заказать", exact: true }).click();
await expect(page.getByText("Укажите адрес доставки.")).toBeVisible();
await expect(page.getByText("Выберите доступную дату и время.")).toBeVisible();
await page.getByRole("button", { name: /Адрес доставки/ }).click();
await page.getByRole("button", { name: "Добавить адрес", exact: true }).click();
await page
  .getByRole("textbox", { name: "Улица", exact: true })
  .fill("Калинина");
await page.getByRole("textbox", { name: "Дом", exact: true }).fill("76");
await page.getByRole("button", { name: "Сохранить адрес" }).click();
await page.getByRole("button", { name: "Выберите время" }).click();
await page.getByRole("button", { name: "10:00–12:00", exact: true }).click();
await page.getByRole("button", { name: /Акции и промокоды/ }).click();
await page
  .getByRole("textbox", { name: "Промокод", exact: true })
  .fill("ЛАСТОЧКА10");
await page.getByRole("button", { name: "Применить промокод" }).click();
await expect(page.getByTestId("cart-total")).toHaveText("933,66 ₽");
await page.getByRole("checkbox", { name: "Согласие с условиями" }).uncheck();
await page.getByRole("button", { name: "Заказать", exact: true }).click();
await expect(
  page.getByText("Для тестового заказа подтвердите согласие с условиями."),
).toBeVisible();
await page.getByRole("checkbox", { name: "Согласие с условиями" }).check();
await page
  .getByPlaceholder("Пиццу очень ждём тёпленькой! :)")
  .fill("Тестовый комментарий");
await page.getByRole("button", { name: "Заказать", exact: true }).dblclick();
await expect(
  page.getByRole("heading", { name: "Тестовый заказ оформлен" }),
).toBeVisible();
let stored = await page.evaluate(
  () => JSON.parse(localStorage.getItem("lastochka-shop")).state,
);
expect(stored.orders.length).toBe(1);
expect(stored.cart.length).toBe(0);
expect(stored.orders[0].total).toBe(93366);
expect(stored.orders[0].comment).toBe("Тестовый комментарий");
expect(stored.orders[0].lines.length).toBe(4);
await page.screenshot({ path: "artifacts/order-success.png", fullPage: true });
await page.reload();
await expect(
  page.getByRole("heading", { name: "Тестовый заказ оформлен" }),
).toBeVisible();
await go("/");
await expect(page.getByRole("button", { name: /Калинина, 76/ })).toBeVisible();
await go("/catalog");
await expect(page.getByText("Нальчик, Калинина, 76")).toBeVisible();
await page.getByRole("link", { name: "Пироги, хычины", exact: true }).click();
await page
  .getByRole("button", { name: /Добавить Хычин Балкарский Карт/ })
  .click();
await go("/cart");
await page.getByRole("button", { name: "Самовывоз", exact: true }).click();
await page.getByRole("button", { name: "Заказать", exact: true }).click();
await expect(page.getByText("Выберите пункт самовывоза.")).toBeVisible();
await page.getByRole("button", { name: /Пункт самовывоза/ }).click();
await page.getByRole("button", { name: /Ласточка Джами/ }).click();
await page.getByRole("button", { name: "Выберите время" }).click();
await page.getByRole("button", { name: "12:00–14:00", exact: true }).click();
await page.getByRole("button", { name: "Заказать", exact: true }).click();
await expect(
  page.getByRole("heading", { name: "Тестовый заказ оформлен" }),
).toBeVisible();
stored = await page.evaluate(
  () => JSON.parse(localStorage.getItem("lastochka-shop")).state,
);
expect(stored.orders.length).toBe(2);
expect(stored.orders[1].total).toBe(93366);
await go("/profile");
await page.getByRole("button", { name: "Выйти", exact: true }).click();
await page.getByRole("button", { name: "Выйти", exact: true }).last().click();
await expect(
  page.getByRole("button", { name: /Войти в профиль/ }),
).toBeVisible();
for (const width of [360, 390, 430, 1280]) {
  await page.setViewportSize({ width, height: 844 });
  for (const route of [
    "/",
    "/catalog",
    "/favorites",
    "/profile",
    "/cart",
    "/notifications",
    "/category/pickles",
    "/product/khychin-potato",
  ]) {
    await go(route);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, `${route} at ${width}`).toBe(false);
    expect(
      await page
        .locator("img")
        .evaluateAll((imgs) =>
          imgs.every((i) => i.complete && i.naturalWidth > 0),
        ),
      `images ${route}`,
    ).toBe(true);
  }
  await go("/");
  await page.screenshot({
    path: `artifacts/home-${width}.png`,
    fullPage: true,
  });
}
await page.setViewportSize({ width: 390, height: 844 });
await go("/?demo");
await page.getByRole("button", { name: "Загрузить демоданные" }).click();
await go("/cart");
await page.getByRole("button", { name: "Очистить корзину" }).click();
await page.keyboard.press("Escape");
await expect(page.getByRole("dialog")).toHaveCount(0);
await expect(
  page.getByRole("button", { name: "Очистить корзину" }),
).toBeFocused();
await page.getByRole("button", { name: "Очистить корзину" }).click();
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Очистить корзину" })
  .click();
await page.reload();
await expect(
  page.getByRole("heading", { name: "В корзине пока пусто" }),
).toBeVisible();
expect(errors).toEqual([]);
console.log(
  "PASS: delivery, pickup, discount, validation, order snapshots, double-click, persistence, search, favorites, address synchronization, guest profile, dialog focus, 4 widths, image loading, empty cart.",
);
await browser.close();
