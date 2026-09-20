import { it, expect, vi } from "vitest";
import { HandTracker } from "../src/tracking/HandTracker";
it("cancelling model load settles initialization and terminates the worker", async () => {
  let terminated = 0;
  vi.stubGlobal("location", { origin: "http://localhost" });
  vi.stubGlobal(
    "Worker",
    class {
      onerror = null;
      onmessage = null;
      postMessage() {}
      terminate() {
        terminated++;
      }
    },
  );
  const tracker = new HandTracker();
  const pending = tracker.init();
  const result = pending.catch((e) => e.message);
  tracker.dispose();
  const settled = await Promise.race([
    result,
    new Promise((r) => setTimeout(() => r("unsettled"), 30)),
  ]);
  expect(settled).toMatch(/cancelled/i);
  expect(terminated).toBe(1);
  vi.unstubAllGlobals();
});
it("never queues a second inference while busy", async () => {
  let posts = 0;
  let worker: { onmessage: ((e: { data: unknown }) => void) | null };
  vi.stubGlobal("location", { origin: "http://localhost" });
  vi.stubGlobal("document", { hidden: false });
  vi.stubGlobal("createImageBitmap", async () => ({ close() {} }));
  vi.stubGlobal(
    "Worker",
    class {
      onmessage: ((e: { data: unknown }) => void) | null = null;
      onerror = null;
      constructor() {
        worker = this;
      }
      postMessage(m: { type: string }) {
        if (m.type === "init")
          queueMicrotask(() => this.onmessage?.({ data: { type: "ready" } }));
        else posts++;
      }
      terminate() {}
    },
  );
  const tracker = new HandTracker();
  await tracker.init();
  const video = { readyState: 4, currentTime: 1 } as HTMLVideoElement;
  await Promise.all([
    tracker.tick(video, 1000),
    tracker.tick(video, 1040),
    tracker.tick(video, 1080),
  ]);
  expect(posts).toBe(1);
  worker!.onmessage?.({
    data: { type: "result", ms: 10, hands: [], timestamp: 1000 },
  });
  video.currentTime = 2;
  await tracker.tick(video, 1120);
  expect(posts).toBe(2);
  tracker.dispose();
  vi.unstubAllGlobals();
});
