import { createHash, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import {
  availableSlots,
  pickupPoints,
  promotionCode,
} from "../src/data/checkout";
import { readCatalog, readOrder } from "./database";
import { totals } from "../src/features/money";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const text = (max: number) => z.string().trim().max(max);
const inputSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    items: z
      .array(
        z
          .object({
            productId: text(100).min(1),
            quantity: z.number().int().positive().max(10000),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    fulfillment: z
      .object({
        mode: z.enum(["delivery", "pickup"]),
        pickupId: text(100),
        slot: text(100).min(1),
      })
      .strict(),
    destination: text(1000),
    comment: text(500),
    payment: z.enum(["receipt", "demo-card"]),
    customer: z.object({ name: text(60), phone: text(40) }).strict(),
    promoCode: text(40),
    consent: z.literal(true),
    expectedTotal: z.number().int().nonnegative().safe(),
  })
  .strict();
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export function createOrder(db: DatabaseSync, owner: string, body: unknown) {
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success)
    throw new ApiError(
      400,
      "Проверьте данные заказа, количество и согласие с условиями.",
    );
  const input = parsed.data;
  const requestHash = hash(JSON.stringify(input));
  db.exec("BEGIN IMMEDIATE");
  try {
    const existing = db
      .prepare(
        "SELECT id, request_hash FROM orders WHERE owner_hash = ? AND idempotency_key = ?",
      )
      .get(owner, input.idempotencyKey);
    if (existing) {
      if (existing.request_hash !== requestHash)
        throw new ApiError(
          409,
          "Этот ключ оформления уже использован для другого заказа.",
        );
      const order = readOrder(db, String(existing.id), owner)!;
      db.exec("COMMIT");
      return { order, repeated: true };
    }
    if (
      new Set(input.items.map((x) => x.productId)).size !== input.items.length
    )
      throw new ApiError(400, "Товар указан в заказе несколько раз.");
    const allProducts = readCatalog(db).products;
    for (const item of input.items) {
      const p = allProducts.find((p) => p.id === item.productId);
      if (!p || item.quantity > p.stock || item.quantity % p.quantityStep !== 0)
        throw new ApiError(
          409,
          "Количество товара недоступно. Обновите корзину.",
        );
    }
    const now = new Date();
    if (
      !availableSlots(input.fulfillment.mode, now).some(
        (s) => s.id === input.fulfillment.slot,
      )
    )
      throw new ApiError(400, "Выберите доступную дату и время.");
    const point = pickupPoints.find((p) => p.id === input.fulfillment.pickupId);
    const destination =
      input.fulfillment.mode === "pickup" ? point?.address : input.destination;
    if (!destination)
      throw new ApiError(400, "Укажите адрес доставки или пункт самовывоза.");
    const code = input.promoCode.toUpperCase();
    if (code && code !== promotionCode)
      throw new ApiError(400, "Промокод недействителен.");
    const total = totals(input.items, allProducts, code === promotionCode);
    if (total.total !== input.expectedTotal)
      throw new ApiError(
        409,
        "Цена изменилась. Проверьте обновлённый итог и повторите оформление.",
      );
    const id = randomUUID(),
      createdAt = now.toISOString();
    db.prepare(
      `INSERT INTO orders (id, owner_hash, idempotency_key, request_hash, created_at, status,
      customer_name, customer_phone, fulfillment_mode, pickup_id, destination, slot, comment, payment_method,
      subtotal, discount, delivery_cost, total, consent_at) VALUES (${Array(19).fill("?").join(",")})`,
    ).run(
      id,
      owner,
      input.idempotencyKey,
      requestHash,
      createdAt,
      "Тестовый заказ",
      input.customer.name,
      input.customer.phone,
      input.fulfillment.mode,
      input.fulfillment.mode === "pickup" ? input.fulfillment.pickupId : "",
      destination,
      input.fulfillment.slot,
      input.comment,
      input.payment,
      total.subtotal,
      total.discount,
      total.delivery,
      total.total,
      createdAt,
    );
    const insert =
      db.prepare(`INSERT INTO order_items (order_id, product_id, product_name, sku, image_url, unit, unit_price, quantity, product_snapshot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const item of input.items) {
      const p = allProducts.find((p) => p.id === item.productId)!;
      insert.run(
        id,
        p.id,
        p.name,
        p.sku,
        p.image,
        p.unit,
        p.price,
        item.quantity,
        JSON.stringify(p),
      );
      db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(
        item.quantity,
        p.id,
      );
    }
    const order = readOrder(db, id, owner)!;
    db.exec("COMMIT");
    return { order, repeated: false };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
