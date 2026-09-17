import { spawn } from "node:child_process";
import { createServer } from "vite";
const api = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
  stdio: "inherit",
  env: process.env,
});
const vite = await createServer();
await vite.listen();
vite.printUrls();
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  await vite.close();
  api.kill("SIGTERM");
  process.exitCode = code;
}
api.on("exit", (code) => {
  void stop(code || 0);
});
process.on("SIGINT", () => {
  void stop();
});
process.on("SIGTERM", () => {
  void stop();
});
