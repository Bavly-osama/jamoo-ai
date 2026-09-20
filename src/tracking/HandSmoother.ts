export interface Point {
  x: number;
  y: number;
}
const alpha = (cutoff: number, dt: number) =>
  1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
export class HandSmoother {
  minCutoff = 1.6;
  beta = 0.35;
  dCutoff = 1;
  private previous?: Point;
  private filtered?: Point;
  private derivative = { x: 0, y: 0 };
  private time = 0;
  reset() {
    this.previous = undefined;
    this.filtered = undefined;
    this.derivative = { x: 0, y: 0 };
  }
  update(p: Point, t: number): Point {
    if (!this.previous || !this.filtered) {
      this.previous = { ...p };
      this.filtered = { ...p };
      this.time = t;
      return { ...p };
    }
    const dt = Math.max(0.001, Math.min(0.15, (t - this.time) / 1000));
    const a = alpha(this.dCutoff, dt);
    for (const axis of ["x", "y"] as const) {
      this.derivative[axis] +=
        a * ((p[axis] - this.previous[axis]) / dt - this.derivative[axis]);
      const f = alpha(
        this.minCutoff + this.beta * Math.abs(this.derivative[axis]),
        dt,
      );
      this.filtered[axis] += f * (p[axis] - this.filtered[axis]);
    }
    this.previous = { ...p };
    this.time = t;
    return { ...this.filtered };
  }
}
