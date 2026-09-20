import { mkdir, cp, writeFile, access } from "node:fs/promises";
import { build } from "esbuild";
// MediaPipe 0.10.32 loads its WASM glue through importScripts. Bundle a classic
// worker explicitly: Vite's development module workers cannot provide that API.
await build({
  entryPoints: ["src/tracking/tracker.worker.ts"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  minify: true,
  outfile: "public/tracker.worker.js",
});
await mkdir("public/models", { recursive: true });
await cp("node_modules/@mediapipe/tasks-vision/wasm", "public/models/wasm", {
  recursive: true,
});
try {
  await access("public/models/hand_landmarker.task");
} catch {
  const response = await fetch(
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  );
  if (!response.ok)
    throw new Error(`Model download failed: ${response.status}`);
  await writeFile(
    "public/models/hand_landmarker.task",
    Buffer.from(await response.arrayBuffer()),
  );
}
console.log("Local MediaPipe model and matching WASM assets ready.");
