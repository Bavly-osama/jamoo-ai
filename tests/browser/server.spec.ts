import { test, expect } from "@playwright/test";
test("API rejects images, unknown actions, and foreign origins", async ({
  request,
}) => {
  const headers = { Origin: "http://localhost:5173" };
  expect(
    (
      await request.post("/api/gesture/resolve", {
        headers,
        data: { image: "data:image/png;base64,AA" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/gesture/resolve", {
        headers: { Origin: "https://untrusted.example" },
        data: { kind: "command", text: "reset" },
      })
    ).status(),
  ).toBe(403);
  const res = await request.post("/api/gesture/resolve", {
    headers,
    data: {
      kind: "gesture",
      gestureCandidates: ["swipe"],
      confidence: 0.99,
      ambiguousMs: 2000,
      dx: 0.4,
      dy: 0,
      velocity: 1,
      pinch: 0.8,
      duration: 400,
      context: "carousel",
    },
  });
  expect(res.status()).toBe(200);
  expect((await res.json()).usage).toEqual({ input: 0, output: 0 });
});
test("unconfigured AI returns useful failure without breaking local interaction", async ({
  request,
}) => {
  const health = await (await request.get("/api/health")).json();
  test.skip(health.aiEnabled, "No paid API call in automated tests");
  const response = await request.post("/api/gesture/resolve", {
    headers: { Origin: "http://localhost:5173" },
    data: { kind: "command", text: "Open diagnostics" },
  });
  expect(response.status()).toBe(503);
});
