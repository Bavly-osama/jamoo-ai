import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
let detector: HandLandmarker;
self.onmessage = async (event: MessageEvent) => {
  const m = event.data;
  if (m.type === "init") {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        m.origin + "/models/wasm",
      );
      detector = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: m.origin + "/models/hand_landmarker.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      self.postMessage({ type: "ready" });
    } catch (e) {
      self.postMessage({ type: "error", message: String(e) });
    }
    return;
  }
  if (m.type === "frame") {
    const start = performance.now();
    try {
      const result = detector.detectForVideo(m.frame, m.timestamp);
      self.postMessage({
        type: "result",
        timestamp: m.timestamp,
        ms: performance.now() - start,
        hands: result.landmarks.map((landmarks, i) => ({
          landmarks,
          id: result.handedness[i]?.[0]?.categoryName ?? String(i),
          confidence: result.handedness[i]?.[0]?.score ?? 0,
        })),
      });
    } catch (e) {
      self.postMessage({ type: "error", message: String(e) });
    } finally {
      m.frame.close();
    }
  }
};
