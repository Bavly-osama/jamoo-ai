import { test, expect } from "@playwright/test";
test("synthetic hands complete every tutorial gate through the actual gesture engine", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let aiRequests = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/gesture/resolve")) aiRequests++;
  });
  await page.addInitScript(() => {
    class SyntheticWorker {
      onmessage: ((e: { data: unknown }) => void) | null = null;
      onerror = null;
      private phase = "";
      private since = 0;
      private anchor = { x: 0.5, y: 0.5 };
      terminate() {}
      postMessage(m: { type: string; timestamp: number; frame?: ImageBitmap }) {
        if (m.type === "init") {
          queueMicrotask(() => this.onmessage?.({ data: { type: "ready" } }));
          return;
        }
        m.frame?.close();
        const text = document.getElementById("setup-status")?.textContent ?? "";
        if (text !== this.phase) {
          this.phase = text;
          this.since = m.timestamp;
          const r = document
            .getElementById("tutorial-target")!
            .getBoundingClientRect();
          this.anchor = {
            x: (r.left + r.width / 2) / innerWidth,
            y: (r.top + r.height / 2) / innerHeight,
          };
        }
        const elapsed = m.timestamp - this.since;
        const hand = (sx: number, sy: number, pinch: number, id = "Left") => {
          const x = 1 - sx,
            y = sy;
          const landmarks = Array.from({ length: 21 }, () => ({ x, y, z: 0 }));
          landmarks[0].y += 0.1;
          landmarks[9].y -= 0.1;
          landmarks[4].x += pinch * 0.2;
          return { id, confidence: 0.99, landmarks };
        };
        let hands = [hand(0.5, 0.5, 0.8)];
        if (text.startsWith("Move your hand comfortably"))
          hands = [hand(0.3 + Math.min(0.4, elapsed / 1500), 0.5, 0.8)];
        if (text.startsWith("Move over the tile"))
          hands = [
            hand(this.anchor.x, this.anchor.y, elapsed < 500 ? 0.8 : 0.15),
          ];
        if (text.startsWith("Release, then"))
          hands = [
            hand(
              this.anchor.x + Math.min(0.15, Math.max(0, elapsed - 700) / 3000),
              this.anchor.y,
              elapsed < 300 ? 0.8 : 0.15,
            ),
          ];
        if (text.startsWith("Release. Raise both")) {
          const d = Math.min(0.13, Math.max(0, elapsed - 400) / 3000);
          hands = [
            hand(0.35 - d, 0.5, 0.15),
            hand(0.65 + d, 0.5, 0.15, "Right"),
          ];
        }
        queueMicrotask(() =>
          this.onmessage?.({
            data: { type: "result", hands, timestamp: m.timestamp, ms: 2 },
          }),
        );
      }
    }
    Object.defineProperty(window, "Worker", { value: SyntheticWorker });
  });
  await page.goto("/");
  await page.locator("#enable").click();
  await expect(page.locator("#welcome")).toBeHidden({ timeout: 30000 });
  await expect(page.locator("#control-mode")).toHaveText("HAND TRACKING");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("aether-calibration")!).enter,
    ),
  ).toBeGreaterThan(0.15);
  expect(aiRequests).toBe(0);
  expect(errors).toEqual([]);
  await page.locator("#camera-toggle").click();
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.srcObject),
  ).toBeNull();
});
test("permission denial provides recovery and mouse preview", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Permission denied", "NotAllowedError");
    };
  });
  await page.goto("/");
  await page.locator("#enable").click();
  await expect(page.locator("#setup-status")).toContainText("permission");
  await page.locator("#preview").click();
  await expect(page.locator("#welcome")).toBeHidden();
});
