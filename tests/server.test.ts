import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { openDatabase, readCatalog } from "../server/database";
import { createApp } from "../server/app";
import { availableSlots } from "../src/data/checkout";

let dir: string,
  db: ReturnType<typeof openDatabase>,
  server: Server,
  origin: string,
  cookie: string;
async function listen() {
  server = createApp(db).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
const request = (path: string, init?: RequestInit, session = cookie) =>
  fetch(origin + path, {
    ...init,
    headers: { Cookie: session, ...init?.headers },
  });
const post = (body: unknown, extra: Record<string, string> = {}) =>
  request("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extra },
    body: JSON.stringify(body),
  });
function order() {
  return {
    idempotencyKey: randomUUID(),
    items: ["raspberry", "khychin-potato", "khychin-cheese", "yogurt"].map(
      (productId) => ({ productId, quantity: 1 }),
    ),
    fulfillment: {
      mode: "delivery",
      pickupId: "",
      slot: availableSlots("delivery")[0].id,
    },
    destination: "Нальчик, Калинина, 76",
    comment: "Тест",
    payment: "receipt",
    customer: { name: "Тест", phone: "+70000000000" },
    promoCode: "ЛАСТОЧКА10",
    consent: true,
    expectedTotal: 93366,
  };
}
beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "lastochka-db-test-"));
  db = openDatabase(join(dir, "shop.sqlite"));
  await listen();
  const response = await fetch(origin + "/api/orders");
  cookie = response.headers.get("set-cookie")!.split(";")[0];
});
afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  db.close();
  rmSync(dir, { recursive: true });
});

describe("SQLite и API", () => {
  it("импортирует каталог и сохраняет правки при повторном запуске", async () => {
    const catalog = await (await request("/api/catalog")).json();
    expect(catalog.products).toHaveLength(26);
    expect(catalog.categories).toHaveLength(11);
    expect(catalog.collections).toHaveLength(5);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    db.prepare("UPDATE products SET price = 12345 WHERE id = 'yogurt'").run();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    db.close();
    db = openDatabase(join(dir, "shop.sqlite"));
    await listen();
    expect(readCatalog(db).products.find((p) => p.id === "yogurt")!.price).toBe(
      12345,
    );
  });
  it("считает скидку на сервере, списывает остаток и сохраняет снимок", async () => {
    const response = await post(order());
    expect(response.status).toBe(201);
    const saved = await response.json();
    expect(saved.total).toBe(93366);
    expect(saved.subtotal).toBe(103740);
    expect(saved.discount).toBe(10374);
    expect(saved.lines).toHaveLength(4);
    expect(saved.storage).toBe("server");
    expect(
      readCatalog(db).products.find((p) => p.id === "raspberry")!.stock,
    ).toBe(11);
    db.prepare(
      "UPDATE products SET price = 1, name = 'Новое название' WHERE id = 'raspberry'",
    ).run();
    const old = await (await request("/api/orders/" + saved.id)).json();
    expect(old.lines[0].product.price).toBe(64900);
    expect(old.lines[0].product.name).toContain("Малина");
  });
  it("повторные одновременные запросы создают один заказ", async () => {
    const body = order();
    const responses = await Promise.all([post(body), post(body)]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 201]);
    const saved = await Promise.all(responses.map((r) => r.json()));
    expect(saved[0].id).toBe(saved[1].id);
    expect(db.prepare("SELECT COUNT(*) AS n FROM orders").get()!.n).toBe(1);
    expect(
      readCatalog(db).products.find((p) => p.id === "raspberry")!.stock,
    ).toBe(11);
    expect((await post({ ...body, comment: "другой заказ" })).status).toBe(409);
  });
  it("чужая сессия не читает заказы даже по известному id", async () => {
    const saved = await (await post(order())).json();
    const stranger = await fetch(origin + "/api/orders");
    expect(stranger.headers.get("set-cookie")).toContain("HttpOnly");
    expect(await stranger.json()).toEqual([]);
    const otherCookie = stranger.headers.get("set-cookie")!.split(";")[0];
    expect(
      (await request("/api/orders/" + saved.id, {}, otherCookie)).status,
    ).toBe(404);
    expect((await post(order(), { Cookie: "" })).status).toBe(401);
    expect(
      (await post(order(), { Origin: "https://example.org" })).status,
    ).toBe(403);
  });
  it("восстанавливает историю и ключ повтора после перезапуска базы и сервера", async () => {
    const input = order();
    const saved = await (await post(input)).json();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    db.close();
    db = openDatabase(join(dir, "shop.sqlite"));
    await listen();
    const history = await (await request("/api/orders")).json();
    expect(history).toEqual([saved]);
    expect((await post(input)).status).toBe(200);
    expect(
      readCatalog(db).products.find((p) => p.id === "raspberry")!.stock,
    ).toBe(11);
  });
  it("откатывает заказ и остатки целиком при ошибке записи", async () => {
    db.exec(`CREATE TRIGGER fail_item BEFORE INSERT ON order_items WHEN NEW.product_id = 'khychin-cheese'
      BEGIN SELECT RAISE(ABORT, 'test rollback'); END;`);
    expect((await post(order())).status).toBe(500);
    expect(db.prepare("SELECT COUNT(*) AS n FROM orders").get()!.n).toBe(0);
    expect(db.prepare("SELECT COUNT(*) AS n FROM order_items").get()!.n).toBe(
      0,
    );
    expect(readCatalog(db).products.every((p) => p.stock === 12)).toBe(true);
  });
  it.each([
    ["подмена итога", { expectedTotal: 1 }, 409],
    ["подмена серверных полей", { total: 1 }, 400],
    ["нет согласия", { consent: false }, 400],
    ["чужой промокод", { promoCode: "FREE" }, 400],
    ["пустой адрес", { destination: "" }, 400],
    [
      "несуществующий товар",
      { items: [{ productId: "unknown", quantity: 1 }] },
      409,
    ],
    [
      "лишнее количество",
      { items: [{ productId: "raspberry", quantity: 13 }] },
      409,
    ],
    [
      "дробное количество",
      { items: [{ productId: "raspberry", quantity: 0.5 }] },
      400,
    ],
    [
      "повтор товара",
      {
        items: [
          { productId: "raspberry", quantity: 1 },
          { productId: "raspberry", quantity: 1 },
        ],
      },
      400,
    ],
    [
      "просроченное время",
      {
        fulfillment: {
          mode: "delivery",
          pickupId: "",
          slot: "delivery|2020-01-01|10:00–12:00",
        },
      },
      400,
    ],
  ])("отклоняет: %s", async (_name, change, status) => {
    expect((await post({ ...order(), ...change })).status).toBe(status);
    expect(db.prepare("SELECT COUNT(*) AS n FROM orders").get()!.n).toBe(0);
    expect(readCatalog(db).products.every((p) => p.stock === 12)).toBe(true);
  });
  it("два покупателя не могут купить последнюю единицу одновременно", async () => {
    db.prepare("UPDATE products SET stock = 1 WHERE id = 'raspberry'").run();
    const response = await fetch(origin + "/api/orders");
    const second = response.headers.get("set-cookie")!.split(";")[0];
    const first = {
      ...order(),
      items: [{ productId: "raspberry", quantity: 1 }],
      promoCode: "",
      expectedTotal: 64900,
    };
    const requests = await Promise.all([
      post(first),
      post({ ...first, idempotencyKey: randomUUID() }, { Cookie: second }),
    ]);
    expect(requests.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      readCatalog(db).products.find((p) => p.id === "raspberry")!.stock,
    ).toBe(0);
    expect((await post(first)).status).toBe(200);
  });
  it("проверяет самовывоз и использует адрес пункта с сервера", async () => {
    const body = {
      ...order(),
      destination: "Подставной адрес",
      fulfillment: {
        mode: "pickup",
        pickupId: "kalinina",
        slot: availableSlots("pickup")[0].id,
      },
    };
    const response = await post(body);
    expect(response.status).toBe(201);
    expect((await response.json()).destination).toBe(
      "Нальчик, ул. Калинина, 76",
    );
    expect(
      (
        await post({
          ...body,
          idempotencyKey: randomUUID(),
          fulfillment: { ...body.fulfillment, pickupId: "unknown" },
        })
      ).status,
    ).toBe(400);
  });
});
