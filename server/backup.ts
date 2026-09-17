import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
const source = resolve(process.env.DATABASE_PATH || "data/lastochka.sqlite");
if (!existsSync(source)) throw new Error("База не найдена: " + source);
const target = resolve(
  process.argv[2] ||
    `backups/lastochka-${new Date().toISOString().replaceAll(":", "-")}.sqlite`,
);
mkdirSync(dirname(target), { recursive: true });
const db = new DatabaseSync(source);
try {
  db.exec("PRAGMA busy_timeout = 5000");
  // SQLite produces a consistent independent copy, including committed WAL data.
  db.prepare("VACUUM INTO ?").run(target);
  console.log("Резервная копия: " + target);
} finally {
  db.close();
}
