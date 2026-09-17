import { resolve } from "node:path";
import { openDatabase } from "./database";
import { createApp } from "./app";
const filename = resolve(process.env.DATABASE_PATH || "data/lastochka.sqlite");
const db = openDatabase(filename);
const app = createApp(db, {
  publicOrigin: process.env.PUBLIC_ORIGIN,
  staticDirectory: "dist",
});
const port = Number(process.env.PORT || 3001);
const server = app.listen(port, process.env.HOST || "127.0.0.1", () => {
  console.log(
    `Ласточка: http://${process.env.HOST || "127.0.0.1"}:${port}; SQLite: ${filename}`,
  );
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
}
