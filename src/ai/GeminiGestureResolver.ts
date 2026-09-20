import { GeminiCommandService } from "./GeminiCommandService";
// Optional semantic fallback. Never receives video/images/frames.
// Local pinch/drag/zoom stay primary; AI only resolves sustained ambiguity.
export class GeminiGestureResolver {
  enabled = false;
  private start?: { x: number; y: number; t: number; pinch: number };
  constructor(private service: GeminiCommandService) {}
  async observe(
    point: { x: number; y: number },
    t: number,
    context: string,
    pinch: number,
    active: boolean,
    overTarget = false,
  ) {
    if (!this.enabled || !context || active) {
      this.start = undefined;
      return null;
    }
    if (context === "tutorial_pinch") {
      if (!overTarget || pinch > 0.48) {
        this.start = undefined;
        return null;
      }
      this.start ??= { ...point, t, pinch };
      const duration = t - this.start.t;
      if (duration < 700) return null;
      this.start = undefined;
      return this.resolve({
        confidence: 0.45,
        ambiguousMs: duration,
        dx: 0,
        dy: 0,
        velocity: 0,
        pinch: Math.min(3, pinch),
        duration,
        context: "tutorial_pinch",
        gestureCandidates: ["pinch", "none"],
      });
    }
    if (context !== "carousel" || pinch < 0.43) {
      this.start = undefined;
      return null;
    }
    this.start ??= { ...point, t, pinch };
    const duration = t - this.start.t;
    if (duration < 1000) return null;
    const dx = point.x - this.start.x,
      dy = point.y - this.start.y;
    this.start = { ...point, t, pinch };
    if (Math.abs(dx) < 0.11 || Math.abs(dx) > 0.3 || Math.abs(dy) > 0.06)
      return null;
    return this.resolve({
      confidence: 0.5,
      ambiguousMs: duration,
      dx: Math.round(dx * 20) / 20,
      dy: Math.round(dy * 20) / 20,
      velocity: Math.abs(dx) / (duration / 1000),
      pinch: Math.min(3, pinch),
      duration,
      context: "carousel",
      gestureCandidates: ["swipe", "none"],
    });
  }
  async resolve(telemetry: {
    confidence: number;
    ambiguousMs: number;
    dx: number;
    dy: number;
    velocity: number;
    pinch: number;
    duration: number;
    context: "carousel" | "tutorial_pinch";
    gestureCandidates: string[];
  }) {
    if (
      !this.enabled ||
      telemetry.confidence >= 0.75 ||
      telemetry.ambiguousMs < 700
    )
      return null;
    return this.service.request({
      kind: "gesture",
      ...telemetry,
    });
  }
}
