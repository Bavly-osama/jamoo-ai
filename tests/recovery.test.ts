import { it, expect } from "vitest";
import { GestureEngine } from "../src/tracking/GestureEngine";
import { hand } from "./scenarios";
import { TokenBudgetManager } from "../src/ai/TokenBudgetManager";
import { PerformanceMonitor } from "../src/performance/PerformanceMonitor";
it("a held pinch cannot reclick after long tracking loss until opened", () => {
  const e = new GestureEngine();
  for (let t = 0; t <= 400; t += 40)
    e.update([hand(0.5, 0.5, t < 80 ? 0.8 : 0.1)], t, "core");
  e.update([], 1200, "core");
  const events = [];
  for (let t = 1240; t < 1800; t += 40)
    events.push(...e.update([hand(0.5, 0.5, 0.1)], t, "core").events);
  expect(events.filter((e) => e.type === "click")).toHaveLength(0);
});
it("zoom out continuously shrinks", () => {
  const e = new GestureEngine();
  let scale = 1;
  for (let i = 0; i < 20; i++) {
    const result = e.update(
      [
        hand(0.2 + i * 0.009, 0.5, 0.1),
        { ...hand(0.8 - i * 0.009, 0.5, 0.1), id: "Right" },
      ],
      i * 40,
      null,
    );
    scale = result.events.find((e) => e.type === "zoom")?.scale ?? scale;
  }
  expect(scale).toBeLessThan(0.8);
});
it("release threshold hysteresis preserves one physical pinch", () => {
  const e = new GestureEngine();
  let clicks = 0;
  for (let i = 0; i < 30; i++) {
    const ratio = i < 3 ? 0.8 : i < 10 ? 0.1 : i % 2 ? 0.31 : 0.36;
    clicks += e
      .update([hand(0.5, 0.5, ratio)], i * 40, "core")
      .events.filter((e) => e.type === "click").length;
  }
  expect(clicks).toBe(1);
});
it("raises quality after sustained high frame rate", () => {
  const p = new PerformanceMonitor();
  p.quality = "LOW";
  for (let i = 1; i <= 400; i++) p.update(i * 16);
  expect(p.quality).not.toBe("LOW");
});
it("reserves room in the token budget for the next answer", () => {
  const b = new TokenBudgetManager();
  b.record(1800, 100);
  expect(b.allow({ confidence: 0.4, ambiguousMs: 1000, key: "x" }, 10000)).toBe(
    false,
  );
});
