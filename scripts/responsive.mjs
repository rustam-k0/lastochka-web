import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Run against the dev server. Every size has an isolated browser store.
const origin = process.env.TEST_ORIGIN || "http://localhost:5173";
const output = "test-results/responsive";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const zoomOnly = process.argv.includes("--zoom-only");
const widths = zoomOnly ? [] : [360, 390, 430, 768, 1024, 1280, 1440, 1920];
const results = [];
const errors = [];
const css = (name) => `[class*="_${name}_"]`;

async function capture(page, { path: filename }) {
  // Capture the visible surface: Playwright's clip coordinates at non-default
  // browser zoom can otherwise produce blank images after scrolling.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const session = await page.context().newCDPSession(page);
  try {
    const { data } = await session.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    fs.writeFileSync(filename, Buffer.from(data, "base64"));
  } finally {
    await session.detach();
  }
}

async function geometry(page, label) {
  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const main = document.querySelector("main").getBoundingClientRect();
    const outside = [...document.querySelectorAll("main *, dialog *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width && r.height && (r.left < -1 || r.right > innerWidth + 1);
      })
      .map((el) => `${el.tagName}.${el.className}`)
      .slice(0, 8);
    const grids = [
      ...document.querySelectorAll(
        '[class*="_productGrid_"], [class*="_collections_"], [class*="_categories_"]',
      ),
    ].map((el) => ({
      columns: getComputedStyle(el).gridTemplateColumns.split(" ").length,
      cardWidth: el.firstElementChild?.getBoundingClientRect().width,
    }));
    return {
      viewport: innerWidth,
      overflow: root.scrollWidth > innerWidth,
      mainWidth: main.width,
      outside,
      grids,
    };
  });
  expect(metrics.overflow, label).toBe(false);
  expect(metrics.outside, label).toEqual([]);
  expect(metrics.mainWidth, label).toBeLessThanOrEqual(1280);
  if (metrics.viewport >= 768)
    expect(metrics.mainWidth, label).toBeGreaterThan(680);
  for (const grid of metrics.grids) {
    if (metrics.viewport >= 1024)
      expect(grid.columns, label).toBeGreaterThanOrEqual(4);
    expect(grid.cardWidth || 0, label).toBeLessThan(300);
  }
  const dialog = page.getByRole("dialog");
  if (await dialog.count()) {
    expect(
      await dialog.evaluate((el) => el.scrollWidth > el.clientWidth),
      label,
    ).toBe(false);
  }
  results.push({ label, ...metrics });
}

async function snapshot(page, label, last) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await geometry(page, label);
  await capture(page, { path: `${output}/${label}.png` });
  if (last) {
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    const targets = page.locator(last);
    const bottom = await targets.last().evaluate((el) => {
      const r = el.getBoundingClientRect();
      const panels = [
        ...document.querySelectorAll(
          'nav, [class*="_floating_"], [class*="_checkoutBar_"]',
        ),
      ]
        .filter((p) => getComputedStyle(p).position === "fixed")
        .map((p) => p.getBoundingClientRect())
        .filter((p) => p.left < r.right && p.right > r.left);
      return {
        bottom: r.bottom,
        limit: Math.min(innerHeight, ...panels.map((p) => p.top)),
      };
    });
    expect(
      bottom.bottom,
      `${label}: last content clears fixed controls`,
    ).toBeLessThanOrEqual(bottom.limit - 4);
    await capture(page, { path: `${output}/${label}-bottom.png` });
  }
}

async function panel(page, trigger, label) {
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await geometry(page, label);
  await capture(page, { path: `${output}/${label}.png` });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

try {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    const go = async (path) => {
      await page.goto(origin + path);
      await page.locator("main header, main nav").first().waitFor();
    };
    const snap = (label, last) => snapshot(page, `${width}-${label}`, last);
    await go("/?demo");
    await page.getByRole("button", { name: "Загрузить демоданные" }).click();
    await snap("home", css("collection"));
    if ([390, 768, 1440].includes(width)) {
      for (const [name, matcher] of [
        ["bonuses", /Бонусы/],
        ["qr", "Карта лояльности"],
        ["promotions", "Акции и промокоды"],
      ]) {
        await panel(
          page,
          page.getByRole("button", { name: matcher }),
          `${width}-${name}`,
        );
      }
    }
    await go("/catalog");
    await snap("catalog", css("category"));
    if ([390, 768, 1440].includes(width))
      await panel(
        page,
        page.getByRole("button", { name: "Поиск по штрихкоду" }),
        `${width}-scanner`,
      );
    await page
      .getByRole("link", { name: "Пироги, хычины", exact: true })
      .click();
    await snap("category", "article");
    await go("/");
    await page.getByRole("link", { name: "Наша выпечка" }).click();
    await snap("collection", "article");
    await go("/favorites");
    await snap("favorites-empty", css("favoritesEmpty") + " p");
    await go("/search");
    await snap("search", "article");
    await page.getByRole("textbox", { name: "Поиск товаров" }).fill("ХЫЧИН");
    await expect(page.getByText("Найдено товаров: 2")).toBeVisible();
    await page
      .getByRole("button", { name: /В избранное: Хычин Балкарский Карт/ })
      .click();
    await go("/favorites");
    await snap("favorites", "article");
    await page.reload();
    await expect(page.locator("article")).toHaveCount(1);
    await go("/product/khychin-potato");
    await snap("product", css("description"));
    await go("/profile");
    await snap("profile", css("support") + " button");
    if ([390, 768, 1440].includes(width)) {
      for (const [name, matcher] of [
        ["profile-form", /\+7 000/],
        ["payment", "Способы оплаты"],
        ["support", "Поддержка"],
        ["documents", "Документы"],
        ["faq", "Вопросы и ответы"],
        ["logout", "Выйти"],
      ]) {
        await panel(
          page,
          page.getByRole("button", {
            name: matcher,
            exact: typeof matcher === "string",
          }),
          `${width}-${name}`,
        );
      }
    }
    await go("/notifications");
    await snap("notifications");
    await go("/orders");
    await snap("orders-empty");
    await go("/cart");
    await snap("cart", css("demoNotice"));
    if ([390, 768, 1440].includes(width)) {
      await panel(
        page,
        page.getByRole("button", { name: "Очистить корзину", exact: true }),
        `${width}-clear`,
      );
      // Exercise the existing manual-share fallback, without an OS share dialog.
      await page.evaluate(() => {
        Object.defineProperty(navigator, "share", {
          value: undefined,
          configurable: true,
        });
        Object.defineProperty(navigator, "clipboard", {
          value: undefined,
          configurable: true,
        });
      });
      await panel(
        page,
        page.getByRole("button", { name: "Поделиться корзиной", exact: true }),
        `${width}-share`,
      );
      await page
        .getByRole("button", { name: "Самовывоз", exact: true })
        .click();
      await panel(
        page,
        page.getByRole("button", { name: /Пункт самовывоза/ }),
        `${width}-pickup`,
      );
      await page.getByRole("button", { name: "Доставка", exact: true }).click();
    }
    await page.getByRole("button", { name: "Заказать", exact: true }).click();
    await expect(page.getByText("Укажите адрес доставки.")).toBeVisible();
    await page.getByRole("button", { name: /Адрес доставки/ }).click();
    await snap("addresses");
    await page
      .getByRole("button", { name: "Добавить адрес", exact: true })
      .click();
    await snap("address-form");
    await page
      .getByRole("textbox", { name: "Улица", exact: true })
      .fill("Калинина");
    await page.getByRole("textbox", { name: "Дом", exact: true }).fill("76");
    await page.getByRole("button", { name: "Сохранить адрес" }).click();
    await page.getByRole("button", { name: "Выберите время" }).click();
    await snap("time");
    await page
      .getByRole("button", { name: "10:00–12:00", exact: true })
      .click();
    await page.getByRole("button", { name: /Акции и промокоды/ }).click();
    await page
      .getByRole("textbox", { name: "Промокод", exact: true })
      .fill("ЛАСТОЧКА10");
    await page.getByRole("button", { name: "Применить промокод" }).click();
    await expect(page.getByTestId("cart-total")).toHaveText("933,66 ₽");
    await page
      .getByPlaceholder("Пиццу очень ждём тёпленькой! :)")
      .fill("Тест адаптивной вёрстки");
    await snap("checkout", css("demoNotice"));
    await page.getByRole("button", { name: "Заказать", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Тестовый заказ оформлен" }),
    ).toBeVisible();
    await snap("order", css("readable") + " > a");
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Тестовый заказ оформлен" }),
    ).toBeVisible();
    const state = await page.evaluate(
      () => JSON.parse(localStorage.getItem("lastochka-shop")).state,
    );
    expect(state.orders).toHaveLength(1);
    expect(state.orders[0].total).toBe(93366);
    expect(state.orders[0].comment).toBe("Тест адаптивной вёрстки");
    expect(state.cart).toHaveLength(0);
    await go("/orders");
    await snap("orders");
    await go("/cart");
    await snap("cart-empty");
    await go("/");
    await expect(
      page.getByRole("button", { name: /Калинина, 76/ }),
    ).toBeVisible();
    await context.close();
    console.log(
      `PASS ${width}px: layouts, fixed panels, dialogs, delivery, discount, persistence`,
    );
  }

  // Intermediate widths, short landscape windows and a reduced keyboard viewport.
  for (const [width, height] of zoomOnly
    ? []
    : [
        [320, 568],
        [559, 700],
        [560, 700],
        [699, 700],
        [700, 700],
        [799, 700],
        [800, 700],
        [959, 700],
        [960, 700],
        [844, 390],
        [1024, 600],
        [390, 300],
      ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const go = async (path) => {
      await page.goto(origin + path);
      await page.locator("main header, main nav").first().waitFor();
    };
    await go("/?demo");
    await page.getByRole("button", { name: "Загрузить демоданные" }).click();
    for (const [name, path, last] of [
      ["home", "/", css("collection")],
      ["catalog", "/catalog", css("category")],
      ["product", "/product/khychin-potato", css("description")],
      ["favorites-empty", "/favorites", css("favoritesEmpty") + " p"],
      ["cart", "/cart", css("demoNotice")],
    ]) {
      await go(path);
      await snapshot(page, `${width}x${height}-${name}`, last);
    }
    await page.getByRole("button", { name: /Адрес доставки/ }).click();
    await page
      .getByRole("button", { name: "Добавить адрес", exact: true })
      .click();
    const comment = page.getByRole("textbox", { name: "Комментарий к адресу" });
    await comment.fill("Проверка клавиатуры");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Сохранить адрес" }),
    ).toBeFocused();
    await geometry(page, `${width}x${height}-dialog`);
    await capture(page, { path: `${output}/${width}x${height}-dialog.png` });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.close();
  }
  // Actual browser zoom, verified through the CSS viewport and devicePixelRatio.
  // A temporary extension uses Chrome's zoom API; no CSS scaling is involved.
  const extension = fs.mkdtempSync(path.join(os.tmpdir(), "lastochka-zoom-"));
  fs.writeFileSync(
    path.join(extension, "manifest.json"),
    JSON.stringify({
      manifest_version: 3,
      name: "Local layout zoom check",
      version: "1.0",
      permissions: ["tabs"],
      background: { service_worker: "background.js" },
    }),
  );
  fs.writeFileSync(
    path.join(extension, "background.js"),
    "chrome.runtime.onInstalled.addListener(() => {});",
  );
  const zoomContext = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  try {
    const worker =
      zoomContext.serviceWorkers()[0] ||
      (await zoomContext.waitForEvent("serviceworker"));
    const page = await zoomContext.newPage();
    await page.goto(origin + "/?demo");
    await page.getByRole("button", { name: "Загрузить демоданные" }).click();
    await worker.evaluate(async (origin) => {
      const tab = (await chrome.tabs.query({})).find((tab) =>
        tab.url.startsWith(origin),
      );
      await chrome.tabs.setZoom(tab.id, 2);
    }, origin);
    for (const width of [768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width / 2);
      for (const [name, route, last] of [
        ["home", "/", css("collection")],
        ["catalog", "/catalog", css("category")],
        ["product", "/product/khychin-potato", css("description")],
        ["profile", "/profile", css("support") + " button"],
        ["cart", "/cart", css("demoNotice")],
      ]) {
        await page.goto(origin + route);
        await page.locator("main header, main nav").first().waitFor();
        await snapshot(page, `zoom200-${width}-${name}`, last);
      }
      await page.getByRole("button", { name: /Адрес доставки/ }).click();
      await page
        .getByRole("button", { name: "Добавить адрес", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "Улица", exact: true })
        .fill("Калинина");
      await page.getByRole("textbox", { name: "Дом", exact: true }).fill("76");
      await page.getByRole("button", { name: "Сохранить адрес" }).click();
      await page.getByRole("button", { name: "Выберите время" }).click();
      await page
        .getByRole("button", { name: "10:00–12:00", exact: true })
        .click();
      await page.getByRole("button", { name: "Заказать", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Тестовый заказ оформлен" }),
      ).toBeVisible();
      await snapshot(page, `zoom200-${width}-order`, css("readable") + " > a");
      await page.goto(origin + "/?demo");
      await page.getByRole("button", { name: "Загрузить демоданные" }).click();
    }
  } finally {
    await zoomContext.close();
    fs.rmSync(extension, { recursive: true });
  }
  expect(errors).toEqual([]);
  fs.writeFileSync(
    `${output}/results${zoomOnly ? "-zoom" : ""}.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(
    `PASS: ${results.length} layout checks; screenshots in ${output}`,
  );
} finally {
  await browser.close();
}
