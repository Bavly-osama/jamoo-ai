import type { Hand } from "./GestureEngine";
export class HandTracker {
  private worker?: Worker;
  private busy = false;
  private lastTime = -1;
  private lastSent = 0;
  private generation = 0;
  private watchdog?: ReturnType<typeof setTimeout>;
  private cancelInit?: () => void;
  ready = false;
  inferenceMs = 0;
  trackingFps = 0;
  targetFps = 30;
  onResult: (hands: Hand[], time: number) => void = () => {};
  onError: (message: string) => void = () => {};
  async init() {
    this.dispose();
    const worker = new Worker("/tracker.worker.js");
    this.worker = worker;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.dispose();
        reject(
          new Error(
            "Hand tracker took too long to load. Check model files and retry.",
          ),
        );
      }, 25000);
      this.cancelInit = () => {
        clearTimeout(timeout);
        reject(new Error("Hand tracker setup cancelled."));
      };
      worker.onerror = (e) => {
        clearTimeout(timeout);
        this.busy = false;
        if (!this.ready) reject(new Error(e.message));
        else this.onError("Hand tracker stopped. Restart the camera.");
      };
      worker.onmessage = (e) => {
        const m = e.data;
        if (m.type === "ready") {
          clearTimeout(timeout);
          this.cancelInit = undefined;
          this.ready = true;
          resolve();
        } else if (m.type === "error") {
          clearTimeout(timeout);
          clearTimeout(this.watchdog);
          this.cancelInit = undefined;
          this.busy = false;
          if (!this.ready)
            reject(new Error("Hand tracker failed: " + m.message));
          else this.onError("Tracking failed. Restart the camera.");
        } else if (m.type === "result") {
          clearTimeout(this.watchdog);
          this.busy = false;
          this.inferenceMs = m.ms;
          this.targetFps = m.ms > 45 ? 20 : 30;
          this.onResult(m.hands, m.timestamp);
        }
      };
      worker.postMessage({ type: "init", origin: location.origin });
    });
  }
  async tick(video: HTMLVideoElement, time: number) {
    if (
      !this.ready ||
      this.busy ||
      document.hidden ||
      video.readyState < 2 ||
      video.currentTime === this.lastTime ||
      time - this.lastSent < 1000 / this.targetFps
    )
      return;
    this.busy = true;
    const generation = this.generation;
    this.lastTime = video.currentTime;
    this.trackingFps = 1000 / Math.max(1, time - this.lastSent);
    this.lastSent = time;
    try {
      const frame = await createImageBitmap(video);
      if (generation !== this.generation || !this.worker) {
        frame.close();
        return;
      }
      this.worker.postMessage({ type: "frame", frame, timestamp: time }, [
        frame,
      ]);
      this.watchdog = setTimeout(() => {
        this.dispose();
        this.onError("Hand tracking timed out. Restart the camera.");
      }, 5000);
    } catch {
      this.busy = false;
      this.onError("Could not read camera frames. Restart the camera.");
    }
  }
  dispose() {
    this.generation++;
    this.cancelInit?.();
    this.cancelInit = undefined;
    clearTimeout(this.watchdog);
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = false;
    this.busy = false;
    this.lastTime = -1;
    this.lastSent = 0;
  }
}
