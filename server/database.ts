import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { categories, products, collections } from "../src/data/catalog";
import type { Product, Category, Order } from "../src/entities/types";

export function openDatabase(filename: string) {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(
    "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;",
  );
  const version = Number(db.prepare("PRAGMA user_version").get()!.user_version);
  if (version > 1) {
    db.close();
    throw new Error("Версия базы новее приложения.");
  }
  if (version === 0) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(
        readFileSync(
          new URL("./migrations/001_initial.sql", import.meta.url),
          "utf8",
        ),
      );
      const addCategory = db.prepare(
        "INSERT INTO categories VALUES (?, ?, ?, ?, ?, ?, ?)",
      );
      for (const category of categories) {
        addCategory.run(
          category.id,
          category.name,
          category.group,
          category.image,
          category.color,
          category.order,
          1,
        );
      }
      // Existing products also reference four categories absent from the visible
      // catalog. Keep their FK targets without adding new interface sections.
      for (const [id, name] of [
        ["dessert", "Десерты"],
        ["dairy", "Молочные продукты"],
        ["home", "Бытовая химия"],
        ["school", "Для школы и офиса"],
      ]) {
        addCategory.run(id, name, "", "", "#f2f2f2", 100, 0);
      }
      const addProduct = db.prepare(
        "INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)",
      );
      products.forEach((p, i) =>
        addProduct.run(
          p.id,
          p.categoryId,
          p.sku,
          p.name,
          p.description,
          p.image,
          p.price,
          p.unit,
          p.stock,
          p.quantityStep,
          i,
        ),
      );
      db.exec("PRAGMA user_version = 1; COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      db.close();
      throw error;
    }
  }
  return db;
}

export function readCatalog(db: DatabaseSync) {
  return {
    products: db
      .prepare(
        `SELECT id, category_id AS categoryId, sku, name, description,
      image_url AS image, price, unit, stock, quantity_step AS quantityStep
      FROM products WHERE is_active = 1 ORDER BY sort_order, id`,
      )
      .all() as unknown as Product[],
    categories: db
      .prepare(
        `SELECT id, name, group_name AS "group", image_url AS image,
      color, sort_order AS "order" FROM categories WHERE is_visible = 1 ORDER BY sort_order, id`,
      )
      .all() as unknown as Category[],
    collections,
  };
}

export function readOrder(
  db: DatabaseSync,
  id: string,
  owner: string,
): Order | undefined {
  const row = db
    .prepare("SELECT * FROM orders WHERE id = ? AND owner_hash = ?")
    .get(id, owner);
  if (!row) return undefined;
  const lines = db
    .prepare(
      "SELECT product_snapshot, quantity FROM order_items WHERE order_id = ? ORDER BY id",
    )
    .all(id);
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    status: "Тестовый заказ",
    storage: "server",
    lines: lines.map((line) => ({
      product: JSON.parse(String(line.product_snapshot)),
      quantity: Number(line.quantity),
    })),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    delivery: Number(row.delivery_cost),
    total: Number(row.total),
    fulfillment: {
      mode: row.fulfillment_mode as "delivery" | "pickup",
      pickupId: String(row.pickup_id),
      slot: String(row.slot),
    },
    destination: String(row.destination),
    comment: String(row.comment),
    payment: row.payment_method as Order["payment"],
  };
}

export function readOrders(db: DatabaseSync, owner: string) {
  return db
    .prepare(
      "SELECT id FROM orders WHERE owner_hash = ? ORDER BY created_at DESC, rowid DESC",
    )
    .all(owner)
    .map((row) => readOrder(db, String(row.id), owner)!);
}
