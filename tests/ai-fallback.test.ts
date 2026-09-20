import { it, expect } from "vitest";
import { GeminiGestureResolver } from "../src/ai/GeminiGestureResolver";
import { GeminiCommandService } from "../src/ai/GeminiCommandService";
it("resolver never calls AI for normal movement or transient ambiguity", async () => {
  let calls = 0;
  const service = new GeminiCommandService();
  service.request = async () => {
    calls++;
    return null;
  };
  const r = new GeminiGestureResolver(service);
  r.enabled = true;
  for (let i = 0; i < 30; i++)
    await r.observe(
      { x: 0.5 + i * 0.002, y: 0.5 },
      i * 40,
      "carousel",
      0.8,
      false,
    );
  expect(calls).toBe(0);
});
it("resolver only submits one compact request for a sustained ambiguous sequence", async () => {
  let calls = 0;
  let payload: Record<string, unknown> = {};
  const service = new GeminiCommandService();
  service.request = async (p) => {
    calls++;
    payload = p;
    return null;
  };
  const r = new GeminiGestureResolver(service);
  r.enabled = true;
  for (let i = 0; i <= 30; i++)
    await r.observe(
      { x: 0.3 + i * 0.005, y: 0.5 },
      i * 40,
      "carousel",
      0.8,
      false,
    );
  expect(calls).toBe(1);
  expect(payload).not.toHaveProperty("image");
  expect(payload.kind).toBe("gesture");
});
it("dragging never enters semantic fallback", async () => {
  let calls = 0;
  const service = new GeminiCommandService();
  service.request = async () => {
    calls++;
    return null;
  };
  const r = new GeminiGestureResolver(service);
  r.enabled = true;
  for (let i = 0; i < 60; i++)
    await r.observe(
      { x: 0.3 + i * 0.006, y: 0.5 },
      i * 40,
      "carousel",
      0.2,
      true,
    );
  expect(calls).toBe(0);
});
it("tutorial pinch assist fires only over the tile with a sustained close", async () => {
  let calls = 0;
  let payload: Record<string, unknown> = {};
  const service = new GeminiCommandService();
  service.request = async (p) => {
    calls++;
    payload = p;
    return { action: "pinch_click", confidence: 0.9 };
  };
  const r = new GeminiGestureResolver(service);
  r.enabled = true;
  for (let i = 0; i <= 25; i++)
    await r.observe(
      { x: 0.5, y: 0.5 },
      i * 40,
      "tutorial_pinch",
      0.3,
      false,
      true,
    );
  expect(calls).toBe(1);
  expect(payload.context).toBe("tutorial_pinch");
  expect(payload).not.toHaveProperty("image");
});
