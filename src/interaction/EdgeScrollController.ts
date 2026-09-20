export class EdgeScrollController {
  private direction = 0;
  private since = 0;
  update(y: number, t: number, visible: boolean, grabbing: boolean) {
    const direction =
      visible && !grabbing ? (y > 0.94 ? 1 : y < 0.06 ? -1 : 0) : 0;
    if (direction !== this.direction) {
      this.direction = direction;
      this.since = t;
    }
    return direction && t - this.since >= 500 ? direction * 260 : 0;
  }
}
