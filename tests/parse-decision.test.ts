import { describe, it, expect } from "vitest";
import { parseDecision } from "../server/parseDecision";

describe("parseDecision", () => {
  it("accepts clean structured output", () => {
    expect(parseDecision('{"action":"pinch_click","confidence":0.9}')).toEqual({
      action: "pinch_click",
      confidence: 0.9,
    });
  });
  it("strips fences and unknown keys", () => {
    const d = parseDecision(
      '```json\n{"action":"swipe_right","confidence":"0.8","component":"x"}\n```',
    );
    expect(d.action).toBe("swipe_right");
    expect(d.confidence).toBe(0.8);
  });
});
