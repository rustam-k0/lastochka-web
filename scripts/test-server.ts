import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { openDatabase } from "../server/database";
import { createApp } from "../server/app";
const directory = mkdtempSync(join(tmpdir(), "lastochka-browser-test-"));
const db = openDatabase(join(directory, "test.sqlite"));
// Responsive checks create many orders on different viewports. This fixture is
// isolated from the real database; stock validation is covered by server tests.
if (process.argv[2]?.includes("responsive"))
  db.exec("UPDATE products SET stock = 1000");
const server = createApp(db, { staticDirectory: "dist" }).listen(
  0,
  "127.0.0.1",
);
await once(server, "listening");
const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
try {
  const child = spawn(process.execPath, process.argv.slice(2), {
    stdio: "inherit",
    env: {
      ...process.env,
      TEST_ORIGIN: origin,
      ARTIFACT_DIR: "test-results/e2e",
    },
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => child.kill(signal));
  const [code] = await once(child, "exit");
  process.exitCode = Number(code ?? 1);
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  db.close();
  rmSync(directory, { recursive: true });
}
