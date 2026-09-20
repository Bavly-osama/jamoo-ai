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
        if (text.startsWith("Move your hand left"))
          hands = [hand(0.3 + Math.min(0.4, elapsed / 1500), 0.5, 0.8)];
        if (
          text.startsWith("Swipe across") ||
          text.startsWith("Yes — slide")
        ) {
          const tile = document.getElementById("tutorial-target");
          const r = tile?.getBoundingClientRect();
          const y = r ? (r.top + r.height / 2) / innerHeight : 0.55;
          const x =
            r && r.width
              ? (r.left + Math.min(1, elapsed / 900) * r.width) / innerWidth
              : 0.2 + Math.min(0.6, elapsed / 900);
          hands = [hand(x, y, 0.8)];
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
