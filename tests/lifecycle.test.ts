import { it, expect, vi } from "vitest";
import {
  CameraController,
  cameraError,
} from "../src/tracking/CameraController";
import { CalibrationManager } from "../src/tracking/CalibrationManager";
import { validatePayload, DecisionSchema } from "../server/schema";
it("camera errors tell the user how to recover", () => {
  expect(cameraError({ name: "NotAllowedError" })).toMatch(/permission/i);
  expect(cameraError({ name: "NotFoundError" })).toMatch(/camera/i);
  expect(cameraError({ name: "NotReadableError" })).toMatch(/another/i);
});
it("late permission grant is stopped after cancellation", async () => {
  let grant!: (s: MediaStream) => void;
  let stopped = false;
  const media = {
    getUserMedia: () => new Promise<MediaStream>((r) => (grant = r)),
  };
  const c = new CameraController({} as HTMLVideoElement, media);
  const pending = c.start();
  c.stop();
  grant({
    getTracks: () => [
      {
        stop() {
          stopped = true;
        },
      },
    ],
  } as unknown as MediaStream);
  await pending;
  expect(stopped).toBe(true);
});
it("a cancelled frame wait cannot stop a newly started camera", async () => {
  vi.useFakeTimers();
  const video = {
    play: async () => {},
    style: {},
    readyState: 2,
    videoWidth: 640,
    currentTime: 0,
    srcObject: null,
  } as unknown as HTMLVideoElement;
  const c = new CameraController(video, {
    getUserMedia: async () =>
      ({ getTracks: () => [{ stop() {} }] }) as unknown as MediaStream,
  });
  const first = c.start().catch((e) => e.message);
  await vi.advanceTimersByTimeAsync(1);
  c.stop();
  const second = c.start().catch((e) => e.message);
  await vi.advanceTimersByTimeAsync(1);
  video.currentTime = 1;
  await vi.advanceTimersByTimeAsync(100);
  expect(await first).toMatch(/cancelled/i);
  expect(await second).toBe(true);
  expect(c.stream).not.toBeNull();
  c.stop();
  vi.useRealTimers();
});
it("calibration records range and valid pinch thresholds", () => {
  const c = new CalibrationManager();
  c.observe(0.25, 0.8, 0.2);
  c.observe(0.75, 0.16, 0.22);
  const result = c.finish("user");
  expect(result.enter).toBeLessThan(result.exit);
  expect(result.range.maxX - result.range.minX).toBeGreaterThan(0.4);
});
it("rejects frame uploads and unbounded telemetry", () => {
  expect(validatePayload({ image: "data:image/png" }).success).toBe(false);
  expect(validatePayload({ kind: "gesture", dx: 999 }).success).toBe(false);
});
it("accepts only bounded telemetry and allowed actions", () => {
  expect(
    validatePayload({ kind: "command", text: "Open diagnostics" }).success,
  ).toBe(true);
  expect(
    DecisionSchema.safeParse({ action: "eval", confidence: 1 }).success,
  ).toBe(false);
});
