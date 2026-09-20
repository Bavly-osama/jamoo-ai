import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const origin = "http://localhost:4318";
const child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: "4318",
    APP_ORIGIN: origin,
    GEMINI_API_KEY: "",
  },
  stdio: "pipe",
  windowsHide: true,
});
child.stderr.on("data", (data) => process.stderr.write(data));
let browser;
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(origin + "/api/health");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready, "Production server must start");
  browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });
  const page = await browser.newPage();
  const errors = [];
  const csp = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.text().includes("Content Security Policy")) csp.push(m.text());
  });
  await page.goto(origin);
  await page.locator("#enable").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#setup-status")?.textContent?.includes("Raise"),
    {},
    { timeout: 30000 },
  );
  await page.keyboard.press("Shift+D");
  await page.waitForTimeout(4000);
  console.log(
    "PRODUCTION CAMERA METRICS\n" +
      (await page.locator("#debug-data").textContent()),
  );
  await page.locator("#cancel").click();
  assert.equal(await page.locator("video").evaluate((v) => v.srcObject), null);
  assert.deepEqual(errors, []);
  assert.deepEqual(csp, []);
  console.log(
    "Production static assets, CSP, local model, video frames, inference and cancellation passed.",
  );
} finally {
  await browser?.close();
  child.kill();
}
