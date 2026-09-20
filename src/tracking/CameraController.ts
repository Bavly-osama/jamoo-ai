export function cameraError(error: unknown) {
  const name = (error as { name?: string })?.name;
  return (
    (
      {
        NotAllowedError:
          "Camera permission is blocked. Allow camera access in your browser settings, then try again.",
        NotFoundError: "No camera found. Connect a camera and try again.",
        NotReadableError:
          "The camera may be in use by another app. Close that app and retry.",
        OverconstrainedError:
          "This camera mode is unavailable. Try the other camera.",
        SecurityError: "Camera access requires HTTPS or localhost.",
      } as Record<string, string>
    )[name ?? ""] ??
    "Camera could not start. Check the connection and try again."
  );
}
export class CameraController {
  stream: MediaStream | null = null;
  facing: "user" | "environment" = "user";
  private generation = 0;
  constructor(
    public video: HTMLVideoElement,
    private media: Pick<MediaDevices, "getUserMedia"> = navigator.mediaDevices,
  ) {}
  async start() {
    this.stop();
    const generation = this.generation;
    if (!this.media)
      throw new Error("Camera access requires HTTPS or localhost.");
    const stream = await this.media.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: this.facing },
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30, max: 30 },
      },
    });
    if (generation !== this.generation) {
      stream.getTracks().forEach((t) => t.stop());
      return false;
    }
    this.stream = stream;
    this.video.srcObject = stream;
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.style.transform = this.facing === "user" ? "scaleX(-1)" : "none";
    try {
      await this.video.play();
      const initial = this.video.currentTime;
      await new Promise<void>((resolve, reject) => {
        const start = performance.now();
        const poll = () => {
          if (generation !== this.generation)
            return reject(new Error("Camera setup cancelled."));
          if (
            this.video.readyState >= 2 &&
            this.video.videoWidth > 0 &&
            this.video.currentTime > initial
          )
            return resolve();
          if (performance.now() - start > 8000)
            return reject(
              new Error("No camera frames arrived. Restart the camera."),
            );
          setTimeout(poll, 60);
        };
        poll();
      });
      return true;
    } catch (e) {
      if (generation === this.generation) this.stop();
      throw e;
    }
  }
  stop() {
    this.generation++;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
  }
}
