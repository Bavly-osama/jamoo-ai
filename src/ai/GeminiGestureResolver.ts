import { GeminiCommandService } from "./GeminiCommandService";
// Optional semantic fallback. Call only after a completed ambiguous carousel sequence.
// Never resolves pinch/drag/zoom or receives video, images, or individual frames.
export class GeminiGestureResolver {
  enabled = false;
  private start?: { x: number; y: number; t: number };
  constructor(private service: GeminiCommandService) {}
  async observe(
    point: { x: number; y: number },
    t: number,
    context: string,
    pinch: number,
    active: boolean,
  ) {
    if (!this.enabled || context !== "carousel" || pinch < 0.43 || active) {
      this.start = undefined;
      return null;
    }
    this.start ??= { ...point, t };
    const duration = t - this.start.t;
    if (duration < 1000) return null;
    const dx = point.x - this.start.x,
      dy = point.y - this.start.y;
    this.start = { ...point, t };
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
    context: "carousel";
  }) {
    if (
      !this.enabled ||
      telemetry.confidence >= 0.75 ||
      telemetry.ambiguousMs < 900 ||
      telemetry.pinch < 0.43
    )
      return null;
    return this.service.request({
      kind: "gesture",
      gestureCandidates: ["swipe", "none"],
      ...telemetry,
    });
  }
}
