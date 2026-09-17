import express from "express";
import type { ErrorRequestHandler } from "express";
import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { readCatalog, readOrders, readOrder } from "./database";
import { ApiError, createOrder, hash } from "./orders";
import { availableSlots } from "../src/data/checkout";

export function createApp(
  db: DatabaseSync,
  options: { publicOrigin?: string; staticDirectory?: string } = {},
) {
  const app = express();
  app.disable("x-powered-by");
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "32kb" }));
  app.get("/api/health", (_req, res) => {
    db.prepare("SELECT 1").get();
    res.json({ ok: true });
  });
  app.get("/api/catalog", (_req, res) => res.json(readCatalog(db)));
  app.get("/api/slots", (req, res) => {
    if (req.query.mode !== "delivery" && req.query.mode !== "pickup")
      throw new ApiError(400, "Неизвестный способ получения.");
    res.json(availableSlots(req.query.mode));
  });
  app.use("/api/orders", (req, res, next) => {
    const origin =
      options.publicOrigin || `${req.protocol}://${req.get("host")}`;
    if (
      (req.get("origin") && req.get("origin") !== origin) ||
      req.get("sec-fetch-site") === "cross-site"
    )
      throw new ApiError(403, "Запрос с другого сайта запрещён.");
    let token = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("lastochka_session="))
      ?.split("=")[1];
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      if (req.method !== "GET")
        throw new ApiError(401, "Обновите страницу для восстановления сессии.");
      token = randomBytes(32).toString("hex");
      res.cookie("lastochka_session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: origin.startsWith("https://"),
        maxAge: 365 * 24 * 60 * 60 * 1000,
        path: "/",
      });
    }
    res.locals.owner = hash(token);
    next();
  });
  app.get("/api/orders", (_req, res) =>
    res.json(readOrders(db, res.locals.owner)),
  );
  app.get("/api/orders/:id", (req, res) => {
    const order = readOrder(db, req.params.id, res.locals.owner);
    if (!order) throw new ApiError(404, "Заказ не найден.");
    res.json(order);
  });
  app.post("/api/orders", (req, res) => {
    if (!req.is("application/json")) throw new ApiError(415, "Ожидается JSON.");
    const { order, repeated } = createOrder(db, res.locals.owner, req.body);
    res.status(repeated ? 200 : 201).json(order);
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Метод не найден." }),
  );
  if (options.staticDirectory) {
    const directory = resolve(options.staticDirectory);
    app.use(express.static(directory));
    app.get(/.*/, (req, res, next) => {
      if (!req.accepts("html") || /\.[a-z0-9]+$/i.test(req.path)) return next();
      res.sendFile(resolve(directory, "index.html"));
    });
  }
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ApiError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (
      error.type === "entity.too.large" ||
      error.type === "entity.parse.failed"
    ) {
      res
        .status(error.type === "entity.too.large" ? 413 : 400)
        .json({ error: "Некорректный запрос." });
      return;
    }
    console.error("Database/API error:", error.message);
    res
      .status(500)
      .json({ error: "Сервис временно недоступен. Попробуйте ещё раз." });
  };
  app.use(errors);
  return app;
}
