import { chromium } from "@playwright/test";
import fs from "node:fs";
fs.mkdirSync("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});
page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
for (const route of [
  "",
  "catalog",
  "favorites",
  "profile",
  "cart",
  "notifications",
]) {
  await page.goto("http://localhost:5173/" + route);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "artifacts/" + (route || "home") + ".png",
    fullPage: true,
  });
}
await browser.close();
