export class PerformanceMonitor {
  fps = 60;
  quality: "HIGH" | "MEDIUM" | "LOW" =
    typeof navigator !== "undefined" && navigator.hardwareConcurrency <= 4
      ? "LOW"
      : "HIGH";
  private frames = 0;
  private last = 0;
  private slow = 0;
  update(t: number) {
    this.frames++;
    if (t - this.last >= 1000) {
      this.fps = (this.frames * 1000) / (t - this.last);
      this.frames = 0;
      this.last = t;
      if (this.fps < 45) this.slow++;
      else if (this.fps > 55) this.slow--;
      else this.slow = this.slow > 0 ? this.slow - 1 : this.slow < 0 ? this.slow + 1 : 0;
      if (this.slow >= 3) {
        this.quality = this.quality === "HIGH" ? "MEDIUM" : "LOW";
        this.slow = 0;
      } else if (this.slow <= -4) {
        this.quality = this.quality === "LOW" ? "MEDIUM" : "HIGH";
        this.slow = 0;
      }
    }
  }
}
