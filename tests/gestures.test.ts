import { describe, it, expect } from "vitest";
import {
  GestureEngine,
  normalizePinch,
  mapPoint,
} from "../src/tracking/GestureEngine";
import { HandSmoother } from "../src/tracking/HandSmoother";
import { TokenBudgetManager } from "../src/ai/TokenBudgetManager";
import { hand, scenarios } from "./scenarios";

describe("hand geometry", () => {
  it("normalizes pinch across distance", () =>
    expect(normalizePinch(hand(0.5, 0.5, 0.2, 2))).toBeCloseTo(
      normalizePinch(hand(0.5, 0.5, 0.2, 1)),
    ));
  it("front camera maps physical right (raw x decreases) to screen right", () =>
    expect(mapPoint({ x: 0.2, y: 0.5 }, true).x).toBe(0.8));
  it("rear camera does not mirror", () =>
    expect(mapPoint({ x: 0.2, y: 0.5 }, false).x).toBe(0.2));
});
describe("temporal interaction", () => {
  it("one long pinch emits one click and one drop", () => {
    const e = new GestureEngine();
    const events = scenarios.longPinch.flatMap(
      (f) => e.update(f.hands, f.t, "core").events,
    );
    expect(events.filter((x) => x.type === "click")).toHaveLength(1);
    expect(events.filter((x) => x.type === "drop")).toHaveLength(1);
  });
  it("brief false pinch never clicks", () => {
    const e = new GestureEngine();
    const events = scenarios.falseDetection.flatMap(
      (f) => e.update(f.hands, f.t, "core").events,
    );
    expect(events.some((x) => x.type === "click")).toBe(false);
  });
  it("drag never emits a swipe", () => {
    const e = new GestureEngine();
    const events = scenarios.drag.flatMap(
      (f) => e.update(f.hands, f.t, "core").events,
    );
    expect(events.some((x) => x.type === "drag")).toBe(true);
    expect(events.some((x) => x.type === "swipe")).toBe(false);
  });
  for (const direction of ["left", "right"] as const)
    it(`swipe ${direction} follows physical movement`, () => {
      const e = new GestureEngine();
      const events = scenarios[direction].flatMap(
        (f) => e.update(f.hands, f.t, null).events,
      );
      expect(events.find((x) => x.type === "swipe")?.direction).toBe(direction);
    });
  it("two hand spread smoothly enlarges without initial jump", () => {
    const e = new GestureEngine();
    const states = scenarios.zoom
      .flatMap((f) => e.update(f.hands, f.t, null).events)
      .filter((x) => x.type === "zoom");
    expect(states[0]?.scale).toBeCloseTo(1);
    expect(states.at(-1)!.scale!).toBeGreaterThan(1);
  });
  it("zoom release does not become a click", () => {
    const e = new GestureEngine();
    const events = scenarios.zoom.flatMap(
      (f) => e.update(f.hands, f.t, "core").events,
    );
    const after = e.update([hand(0.5, 0.5, 0.15)], 1200, "core");
    expect([...events, ...after.events].some((x) => x.type === "click")).toBe(
      false,
    );
  });
  it("loss preserves cursor briefly then fades, safely dropping", () => {
    const e = new GestureEngine();
    scenarios.longPinch
      .slice(0, -3)
      .forEach((f) => e.update(f.hands, f.t, "core"));
    const t = 800;
    expect(e.update([], t, null).visible).toBe(true);
    expect(e.update([], 1500, null).visible).toBe(false);
  });
  it("rejects low-confidence input", () => {
    const e = new GestureEngine();
    const h = hand(0.5, 0.5, 0.1);
    h.confidence = 0.2;
    expect(e.update([h], 0, "core").visible).toBe(false);
  });
  it("open palm dwell emits one cancel without clicking", () => {
    const e = new GestureEngine();
    const events = [];
    for (let i = 0; i < 20; i++)
      events.push(...e.update([hand(0.5, 0.5, 0.8)], i * 40, "core").events);
    expect(events.filter((x) => x.type === "cancel")).toHaveLength(1);
    expect(events.some((x) => x.type === "click")).toBe(false);
  });
  it("moving open palm does not emit cancel", () => {
    const e = new GestureEngine();
    const events = [];
    for (let i = 0; i < 12; i++)
      events.push(...e.update([hand(0.15 + i * 0.06)], i * 40, null).events);
    expect(events.some((x) => x.type === "cancel")).toBe(false);
  });
  it("acquires click if target appears after pinch starts", () => {
    const e = new GestureEngine();
    const events = [];
    for (let i = 0; i < 8; i++)
      events.push(
        ...e.update([hand(0.5, 0.5, 0.15)], i * 40, i < 4 ? null : "tutorial")
          .events,
      );
    expect(events.filter((x) => x.type === "click")).toHaveLength(1);
    expect(events.find((x) => x.type === "click")?.target).toBe("tutorial");
  });
  it("accepts a partial pinch under the forgiving enter threshold", () => {
    const e = new GestureEngine();
    e.openBaseline = 0.9;
    const events = [];
    for (let i = 0; i < 8; i++)
      events.push(
        ...e.update([hand(0.5, 0.5, i < 2 ? 0.8 : 0.4)], i * 40, "tutorial")
          .events,
      );
    expect(events.some((x) => x.type === "click")).toBe(true);
  });
  it("accepts a near-miss pinch with a small tip gap", () => {
    const e = new GestureEngine();
    e.openBaseline = 0.95;
    e.enter = 0.62;
    const events = [];
    for (let i = 0; i < 10; i++)
      events.push(
        ...e.update([hand(0.5, 0.5, i < 2 ? 0.9 : 0.55)], i * 40, "tutorial")
          .events,
      );
    expect(events.some((x) => x.type === "click")).toBe(true);
  });
  it("treats a fast closing motion as a pinch", () => {
    const e = new GestureEngine();
    e.openBaseline = 1;
    const events = [];
    for (let i = 0; i < 8; i++)
      events.push(
        ...e.update(
          [hand(0.5, 0.5, i === 0 ? 1 : i === 1 ? 0.75 : 0.58)],
          i * 40,
          "tutorial",
        ).events,
      );
    expect(events.some((x) => x.type === "click")).toBe(true);
  });
  it("easy mode accepts a loose near-miss pinch", () => {
    const e = new GestureEngine();
    e.easyMode = true;
    e.openBaseline = 0.95;
    const events = [];
    for (let i = 0; i < 8; i++)
      events.push(
        ...e.update([hand(0.5, 0.5, i < 2 ? 0.9 : 0.7)], i * 40, "tutorial")
          .events,
      );
    expect(events.some((x) => x.type === "click")).toBe(true);
  });
  it("two hands crossing retain primary identity", () => {
    const e = new GestureEngine();
    const a = hand(0.3, 0.5, 0.8);
    a.id = "Left";
    const b = hand(0.7, 0.5, 0.8);
    b.id = "Right";
    e.update([a, b], 0, null);
    const s = e.update([b, a], 40, null);
    expect(s.primaryId).toBe("Left");
  });
  it("all replay scenarios remain finite", () => {
    for (const frames of Object.values(scenarios)) {
      const e = new GestureEngine();
      for (const f of frames) {
        const s = e.update(f.hands, f.t, "core");
        expect(Number.isFinite(s.point.x + s.point.y)).toBe(true);
      }
    }
  });
});
describe("smoothing", () => {
  it("reduces stationary jitter without freezing fast motion", () => {
    const s = new HandSmoother();
    let p = { x: 0.5, y: 0.5 };
    for (let i = 0; i < 40; i++)
      p = s.update({ x: 0.5 + (i % 2 ? 0.006 : -0.006), y: 0.5 }, i * 33);
    expect(Math.abs(p.x - 0.5)).toBeLessThan(0.006);
    expect(s.update({ x: 0.85, y: 0.5 }, 1400).x).toBeGreaterThan(0.65);
  });
});
describe("AI budget", () => {
  it("normal gestures never qualify", () => {
    const b = new TokenBudgetManager();
    expect(b.allow({ confidence: 0.95, ambiguousMs: 3000, key: "a" }, 0)).toBe(
      false,
    );
  });
  it("requires sustained ambiguity and enforces cooldown", () => {
    const b = new TokenBudgetManager();
    expect(b.allow({ confidence: 0.4, ambiguousMs: 100, key: "a" }, 0)).toBe(
      false,
    );
    expect(b.allow({ confidence: 0.4, ambiguousMs: 1000, key: "a" }, 0)).toBe(
      true,
    );
    expect(b.allow({ confidence: 0.4, ambiguousMs: 1000, key: "b" }, 100)).toBe(
      false,
    );
  });
  it("caches identical decisions and limits session tokens", () => {
    const b = new TokenBudgetManager();
    b.put("a", { action: "NONE", confidence: 0.9 }, 0);
    expect(b.get("a", 100)?.action).toBe("NONE");
    b.record(1900, 200);
    expect(
      b.allow({ confidence: 0.4, ambiguousMs: 1000, key: "b" }, 10000),
    ).toBe(false);
  });
});
