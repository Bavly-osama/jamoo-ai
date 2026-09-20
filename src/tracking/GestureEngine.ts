import { HandSmoother, type Point } from "./HandSmoother";
export interface Landmark extends Point {
  z: number;
}
export interface Hand {
  id: string;
  confidence: number;
  landmarks: Landmark[];
}
export type State =
  | "IDLE"
  | "HOVERING"
  | "PINCH_STARTING"
  | "PINCHED"
  | "DRAGGING"
  | "RELEASING"
  | "SWIPING"
  | "ZOOMING";
export interface GestureEvent {
  type: "click" | "drag" | "drop" | "swipe" | "zoom" | "cancel";
  target?: string;
  point?: Point;
  direction?: "left" | "right";
  scale?: number;
}
export const clamp = (x: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, x));
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export const mapPoint = (p: Point, mirrored = true): Point => ({
  x: mirrored ? 1 - p.x : p.x,
  y: p.y,
});
export function normalizePinch(h: Hand) {
  return (
    distance(h.landmarks[4], h.landmarks[8]) /
    Math.max(0.015, distance(h.landmarks[0], h.landmarks[9]))
  );
}
export class GestureEngine {
  smoother = new HandSmoother();
  mirrored = true;
  enter = 0.28;
  exit = 0.43;
  state: State = "IDLE";
  point: Point = { x: 0.5, y: 0.5 };
  rawPosition: Point = { x: 0.5, y: 0.5 };
  velocity: Point = { x: 0, y: 0 };
  confidence = 0;
  pinch = 1;
  primaryId = "";
  private lastReliable = -Infinity;
  private previousTime = 0;
  private pinchSince: number | null = null;
  private releaseSince: number | null = null;
  private held = false;
  private target: string | null = null;
  private lastClick = -Infinity;
  private swipeStart?: { p: Point; t: number };
  private lastSwipe = -Infinity;
  private zoomSince: number | null = null;
  private zoomBase = 0;
  private zoomScale = 1;
  private zoomLocked = false;
  private hoverTarget: string | null = null;
  private hoverSince = 0;
  private requireOpen = false;
  private openSince: number | null = null;
  private lastCancel = -Infinity;
  update(hands: Hand[], t: number, hit: string | null) {
    const events: GestureEvent[] = [];
    const valid = hands.filter(
      (h) =>
        h.confidence >= 0.65 &&
        h.landmarks.length === 21 &&
        h.landmarks.every((p) => Number.isFinite(p.x + p.y + p.z)),
    );
    const hand = valid.find((h) => h.id === this.primaryId) ?? valid[0];
    if (!hand) {
      const age = t - this.lastReliable;
      if (age > 350) {
        if (this.held) {
          events.push({ type: "drop", target: this.target ?? undefined });
          this.requireOpen = true;
        }
        this.held = false;
        this.target = null;
        this.pinchSince = null;
        this.releaseSince = null;
        this.zoomBase = 0;
        this.zoomSince = null;
        this.state = "IDLE";
        this.swipeStart = undefined;
      }
      return this.snapshot(
        events,
        age < 550,
        clamp(1 - (age - 350) / 200),
        age,
      );
    }
    const changed = this.primaryId !== hand.id;
    if (changed || t - this.lastReliable > 550) {
      this.smoother.reset();
      this.velocity = { x: 0, y: 0 };
      this.swipeStart = undefined;
    }
    if (changed && this.held) {
      events.push({ type: "drop", target: this.target ?? undefined });
      this.held = false;
      this.target = null;
    }
    this.primaryId = hand.id;
    this.confidence = hand.confidence;
    this.rawPosition = mapPoint(hand.landmarks[8], this.mirrored);
    const old = this.point;
    this.point = this.smoother.update(this.rawPosition, t);
    const dt = Math.max(0.001, (t - this.previousTime) / 1000);
    this.velocity = {
      x: (this.point.x - old.x) / dt,
      y: (this.point.y - old.y) / dt,
    };
    this.previousTime = t;
    this.lastReliable = t;
    this.pinch = normalizePinch(hand);
    if (this.requireOpen) {
      if (this.pinch > this.exit) this.requireOpen = false;
      else return this.snapshot(events, true, 1, 0);
    }
    if (hit !== this.hoverTarget) {
      this.hoverTarget = hit;
      this.hoverSince = t;
    }
    const stableTarget = t - this.hoverSince >= 60 ? hit : null;
    // Both hands must deliberately pinch for 120ms. This excludes casual second hands.
    const both =
      valid.length === 2 && valid.every((h) => normalizePinch(h) < this.exit);
    if (both) {
      this.zoomSince ??= t;
      if (t - this.zoomSince >= 120) {
        const d = distance(valid[0].landmarks[8], valid[1].landmarks[8]);
        if (!this.zoomBase) {
          this.zoomBase = Math.max(0.08, d);
          this.zoomScale = 1;
          if (this.held)
            events.push({ type: "drop", target: this.target ?? undefined });
          this.held = false;
          this.target = null;
        }
        this.zoomScale +=
          0.22 * (clamp(d / this.zoomBase, 0.5, 2.5) - this.zoomScale);
        this.state = "ZOOMING";
        this.zoomLocked = true;
        this.pinchSince = null;
        this.swipeStart = undefined;
        events.push({ type: "zoom", scale: this.zoomScale });
        return this.snapshot(events, true, 1, 0);
      }
      return this.snapshot(events, true, 1, 0);
    } else {
      this.zoomSince = null;
      this.zoomBase = 0;
    }
    if (this.zoomLocked) {
      this.state = "IDLE";
      if (valid.every((h) => normalizePinch(h) > this.exit))
        this.zoomLocked = false;
      return this.snapshot(events, true, 1, 0);
    }
    if (!this.held) {
      if (this.pinch < this.enter) {
        this.pinchSince ??= t;
        this.state = "PINCH_STARTING";
        this.swipeStart = undefined;
        this.openSince = null;
        if (t - this.pinchSince >= 80 && t - this.lastClick >= 300) {
          this.held = true;
          this.target = stableTarget;
          this.state = "PINCHED";
          this.lastClick = t;
          if (this.target)
            events.push({
              type: "click",
              target: this.target,
              point: this.point,
            });
        }
      } else {
        this.pinchSince = null;
        this.state = stableTarget ? "HOVERING" : "IDLE";
        this.detectSwipe(t, events);
        this.detectCancel(t, events);
      }
    } else {
      if (this.pinch > this.exit) {
        this.releaseSince ??= t;
        this.state = "RELEASING";
        if (t - this.releaseSince >= 60) {
          if (this.target)
            events.push({
              type: "drop",
              target: this.target,
              point: this.point,
            });
          this.held = false;
          this.target = null;
          this.pinchSince = null;
          this.releaseSince = null;
          this.state = "IDLE";
          this.swipeStart = undefined;
        }
      } else {
        this.releaseSince = null;
        if (this.target && t - (this.pinchSince ?? t) >= 180) {
          this.state = "DRAGGING";
          events.push({ type: "drag", target: this.target, point: this.point });
        }
      }
    }
    return this.snapshot(events, true, 1, 0);
  }
  private detectCancel(t: number, events: GestureEvent[]) {
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    if (this.pinch > 0.65 && speed < 0.35 && this.state !== "SWIPING") {
      this.openSince ??= t;
      if (t - this.openSince >= 400 && t - this.lastCancel >= 1200) {
        events.push({ type: "cancel" });
        this.lastCancel = t;
      }
    } else this.openSince = null;
  }
  private detectSwipe(t: number, events: GestureEvent[]) {
    if (t - this.lastSwipe < 700) return;
    if (!this.swipeStart || t - this.swipeStart.t > 450)
      this.swipeStart = { p: { ...this.point }, t };
    const dx = this.point.x - this.swipeStart.p.x,
      dy = this.point.y - this.swipeStart.p.y,
      elapsed = t - this.swipeStart.t;
    if (
      elapsed >= 80 &&
      Math.abs(dx) > 0.16 &&
      Math.abs(dx) / (elapsed / 1000) > 0.55 &&
      Math.abs(dy) < 0.09
    ) {
      events.push({ type: "swipe", direction: dx > 0 ? "right" : "left" });
      this.lastSwipe = t;
      this.swipeStart = undefined;
      this.state = "SWIPING";
    }
  }
  private snapshot(
    events: GestureEvent[],
    visible: boolean,
    opacity: number,
    age: number,
  ) {
    const predicted = {
      x: clamp(
        this.point.x + ((this.velocity.x * Math.min(age, 80)) / 1000) * 0.3,
      ),
      y: clamp(
        this.point.y + ((this.velocity.y * Math.min(age, 80)) / 1000) * 0.3,
      ),
    };
    return {
      events,
      point: predicted,
      raw: this.rawPosition,
      velocity: this.velocity,
      visible,
      opacity,
      state: this.state,
      confidence: this.confidence,
      pinch: this.pinch,
      primaryId: this.primaryId,
      hover: !age && this.state === "HOVERING" ? this.hoverTarget : null,
    };
  }
}
export type TrackingState = ReturnType<GestureEngine["update"]>;
