import { it, expect } from "vitest";
import { EdgeScrollController } from "../src/interaction/EdgeScrollController";
it("edge scrolling requires dwell and stops during a grab", () => {
  const s = new EdgeScrollController();
  expect(s.update(0.98, 0, true, false)).toBe(0);
  expect(s.update(0.98, 600, true, false)).toBeGreaterThan(0);
  expect(s.update(0.98, 640, true, true)).toBe(0);
  expect(s.update(0.02, 680, true, false)).toBe(0);
  expect(s.update(0.02, 1300, true, false)).toBeLessThan(0);
  expect(s.update(0.02, 1340, false, false)).toBe(0);
});
