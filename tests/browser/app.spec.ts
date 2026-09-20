import { test, expect } from "@playwright/test";
test("startup, preview, inspection, responsive layout and diagnostics", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let aiCalls = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/gesture/resolve")) aiCalls++;
  });
  await page.goto("/");
  await expect(page.locator("#enable")).toBeVisible();
  await page.getByRole("button", { name: "Explore with mouse" }).click();
  await expect(page.locator("#welcome")).toBeHidden();
  await page.getByRole("button", { name: "Inspect reactor" }).click();
  await expect(page.locator("#inspection")).toBeVisible();
  await page.getByRole("button", { name: "Close inspection" }).click();
  await page.getByRole("button", { name: "Diagnostics", exact: true }).click();
  await expect(page.locator("#debug")).toBeVisible();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  const metrics = await page.locator("#debug-data").innerText();
  console.log("DESKTOP METRICS", metrics);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Diagnostics", exact: true }).click();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(aiCalls).toBe(0);
  expect(errors).toEqual([]);
});
test("camera delivers frames and model initializes, no hand does not bypass onboarding", async ({
  page,
}) => {
  page.on("console", (m) => {
    if (m.type() === "error") console.log("CAMERA CONSOLE", m.text());
  });
  page.on("pageerror", (e) => console.log("CAMERA ERROR", e.message));
  await page.goto("/");
  await page.locator("#enable").click();
  await expect(page.locator("#setup-status")).toContainText("Raise", {
    timeout: 40000,
  });
  const frames = await page
    .locator("video")
    .evaluate((v: HTMLVideoElement) => ({
      time: v.currentTime,
      width: v.videoWidth,
    }));
  expect(frames.time).toBeGreaterThan(0);
  expect(frames.width).toBeGreaterThan(0);
  await expect(page.locator("#welcome")).toBeVisible();
  await page.keyboard.press("Shift+D");
  await page.waitForTimeout(4000);
  console.log(
    "CAMERA METRICS",
    await page.locator("#debug-data").textContent(),
  );
  await page.getByRole("button", { name: "Cancel setup" }).click();
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.srcObject),
  ).toBeNull();
});
