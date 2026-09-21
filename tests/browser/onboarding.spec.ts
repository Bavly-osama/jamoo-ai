import { test, expect } from "@playwright/test";
import {hand} from "../scenarios";
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
        const text = document.getElementById("tutorial-target")?.dataset.stage ?? "0";
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
        if (text === "2" || text === "6")
          hands = [hand(elapsed<600?.22:.78, 0.5, .9)];
        if (["1","3","4","5"].includes(text)) {
          const tile = document.getElementById("tutorial-target");
          const r = tile?.getBoundingClientRect();
          const y = r ? (r.top + r.height / 2) / innerHeight : 0.55;
          const x = r ? (r.left+r.width/2)/innerWidth : .5;
          hands = [hand(text==="5"?.5+Math.min(.25,elapsed/2500):x,y,text==="1"||elapsed<220&&text==="3"?.9:.12)];
        }
        if(text==="7") {const separation=elapsed<500?.25:elapsed<1200?.45:.18;hands=[hand(.5-separation/2,.5,.12),hand(.5+separation/2,.5,.12,"Right")];}
        if((window as any).__hands)hands=(window as any).__hands;
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
  await expect(page.locator("#tutorial-listen")).toBeVisible({timeout:30000});
  // Synthetic worker verifies all hand stages; microphone is explicitly skipped.
  await page.locator("#tutorial-optional").click();
  await expect(page.locator("#welcome")).toBeHidden({ timeout: 30000 });
  await expect(page.locator("#control-mode")).toHaveText("HAND TRACKING");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("aether-calibration")!).enter,
    ),
  ).toBeGreaterThan(0.15);
  expect(aiRequests).toBe(0);
  expect(errors).toEqual([]);
  // Continue without refreshing through hand-driven module selection and rotation.
  const pose=async(x:number,y:number,pinch=.9)=>{
    await page.evaluate(h=>{(window as any).__hands=[h];},hand(1-x,y,pinch));
  };
  await pose(.5,.3);
  await page.locator('[data-dot="1"]').click();
  await page.locator("#module-earth").scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  const earth=await page.locator("#module-earth").boundingBox();
  const size=page.viewportSize()!;
  await pose((earth!.x+earth!.width/2)/size.width,(earth!.y+earth!.height/2)/size.height);
  await page.waitForTimeout(400);
  await pose((earth!.x+earth!.width/2)/size.width,(earth!.y+earth!.height/2)/size.height,.12);
  await expect(page.locator("#activity-title")).toHaveText("Earth Scan",{timeout:5000});
  await pose(.5,.4);await page.waitForTimeout(250);
  const projection=await page.locator("#projection-input").boundingBox();
  const px=(projection!.x+projection!.width/2)/size.width,py=(projection!.y+projection!.height/2)/size.height;
  await pose(px,py,.12);await page.waitForTimeout(350);await pose(px+.12,py,.12);await page.waitForTimeout(250);
  await pose(px+.12,py);await page.waitForTimeout(250);
  const back=await page.locator("#close-activity").boundingBox();
  await pose((back!.x+back!.width/2)/size.width,(back!.y+back!.height/2)/size.height);
  await page.waitForTimeout(400);
  await pose((back!.x+back!.width/2)/size.width,(back!.y+back!.height/2)/size.height,.12);
  await expect(page.locator("#activity")).toBeHidden({timeout:5000});
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
