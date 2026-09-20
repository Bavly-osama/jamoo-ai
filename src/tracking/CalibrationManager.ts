export interface Calibration {
  enter: number;
  exit: number;
  handScale: number;
  range: { minX: number; maxX: number };
  facing: string;
  created: number;
}
export class CalibrationManager {
  private minX = 1;
  private maxX = 0;
  private minPinch = 1;
  private scales: number[] = [];
  observe(x: number, pinch: number, scale: number) {
    this.minX = Math.min(this.minX, x);
    this.maxX = Math.max(this.maxX, x);
    this.minPinch = Math.min(this.minPinch, pinch);
    if (this.scales.length < 300) this.scales.push(scale);
  }
  finish(facing: string): Calibration {
    const enter = Math.min(0.65, Math.max(0.5, this.minPinch + 0.14));
    return {
      enter,
      exit: enter + 0.16,
      handScale:
        this.scales.reduce((a, b) => a + b, 0) /
        Math.max(1, this.scales.length),
      range: { minX: this.minX, maxX: this.maxX },
      facing,
      created: Date.now(),
    };
  }
  static load(): Calibration | null {
    try {
      const c = JSON.parse(
        localStorage.getItem("aether-calibration") ?? "null",
      );
      return c &&
        Number.isFinite(c.enter) &&
        c.enter >= 0.15 &&
        c.enter <= 0.6 &&
        c.exit > c.enter &&
        Date.now() - c.created < 30 * 86400000
        ? c
        : null;
    } catch {
      return null;
    }
  }
  static save(c: Calibration) {
    try {
      localStorage.setItem("aether-calibration", JSON.stringify(c));
    } catch {
      /* Storage can be disabled in private browsing. */
    }
  }
}
