# AETHER — spatial intelligence

A lightweight hand-controlled holographic workspace built with TypeScript, Three.js and MediaPipe Tasks Vision. Camera frames stay on the device. Gemini is optional and never drives real-time gestures.

## Run locally

Requirements: Node.js 22.12+ (Node 24 recommended), a modern WebGL browser and a webcam.

```powershell
cd G:\jamoo-2
npm ci
npm run assets
Copy-Item .env.example .env
npm run dev
```

Open http://localhost:5173. Optional: set `GEMINI_API_KEY` in `.env` and restart the server. Never use a `VITE_` prefix for secrets. No API key is needed for tracking, gestures, graphics, or calibration.

Select **Enable camera**, allow access, and follow the detection-gated tutorial: open palm, move left/right, pinch the tile, release and drag it, then pinch with both hands and spread. Completion has no skip timer. **Explore with mouse** is an explicitly separate camera-free preview; it does not mark calibration complete.

The browser must receive actual changing video frames before loading the model. No-hand video remains in setup. A front camera mirrors both video and coordinate interpretation exactly once. A rear camera is not mirrored. Returning from a backgrounded tab requires enabling the camera again; this intentionally avoids silently reopening it.

### Controls

- Index fingertip: pointer. Thumb/index pinch: select once. Continue holding: drag a module tile. Release: drop.
- Open palm held still for a moment closes inspection or diagnostics.
- Hold the open-hand pointer near the top/bottom screen edge for half a second to scroll on smaller screens; scrolling stops while grabbing.
- Open-hand horizontal swipe: next/previous module; disabled while pinching or dragging.
- Pinch with **both** hands for 120 ms, then spread/contract: continuous object scale. Release both before selecting again.
- The circular ring around the hologram (CORE / ATLAS / SCAN / SYS) switches the 3D object. The carousel below does the same.
- Mouse: click modules, drag tiles, wheel over the reactor to resize. Arrow keys navigate modules. Escape closes panels.
- **Shift+D** or **Diagnostics**: live metrics, smoothing parameters, optional landmarks, camera restart/switch, recalibration, opt-in semantic fallback.
- AI command box: e.g. “open system diagnostics”, “focus globe”, “reset scene”. Requires server configuration.

## Architecture and files

| Area | Implementation |
| --- | --- |
| Entry/UI | `src/main.ts`, `src/style.css`, `index.html`: startup gates, tutorial, HUD, controls, a single render loop |
| Camera | `src/tracking/CameraController.ts`: permission/error handling, verified frame delivery, cancellation, stream cleanup |
| Inference | `HandTracker.ts`, `tracker.worker.ts`: local VIDEO inference on a dedicated worker, one transferred ImageBitmap in flight, 20–30 Hz scheduling, watchdog, CPU delegate for compatibility |
| Pointer | `HandSmoother.ts`: One Euro filter, configurable minCutoff/beta/dCutoff |
| Gestures | `GestureEngine.ts`: hand-relative pinch ratio, hysteresis, temporal confirmation, hover dwell, one click, drag/drop, velocity/distance/time swipe, deliberate two-hand zoom |
| Recovery | 350 ms tracking persistence, bounded velocity prediction, 200 ms fade; safe drop and open-hand rearm after prolonged loss |
| Calibration | `CalibrationManager.ts`: local pinch thresholds, hand scale and comfortable horizontal range estimates; 30-day local storage |
| Interaction | `InteractionManager.ts`: expanded screen-space hit areas, modal exclusion, damped spring drag |
| Graphics | `scene/JarvisScene.ts`: original procedural reactor, orbital globe, rings, particles, WebGL fallback and disposal |
| Performance | `performance/PerformanceMonitor.ts`: sustained slow-frame detection reduces DPR and particles before lowering tracking frequency |
| AI client | `ai/GeminiCommandService.ts`, `GeminiGestureResolver.ts`, `TokenBudgetManager.ts`: asynchronous typed action requests, conservative gating, cooldown, cache and counters |
| AI server | `server/index.ts`, `server/schema.ts`: server-only SDK/key, strict Zod validation, JSON Schema output, origin check, body limit, request rate limit, timeout, cache, bounded spend |
| Assets/tests | `scripts/assets.mjs`, `public/models`, `tests`, `playwright.config.ts`, `vitest.config.ts` |

There is one `requestAnimationFrame` chain. The tracker accepts a new frame only when idle and when the video timestamp changes; old frames never queue. ImageBitmaps are closed after inference. Models and WASM are served locally after `npm run assets`. Disconnecting the internet after loading does not stop normal gestures. This is not an offline-installable PWA.

MediaPipe exposes handedness classification scores, not a public per-result detection confidence. Diagnostics label that distinction. Internal detection, presence and tracking thresholds are 0.65. Hand identity uses handedness; extended occlusion/crossing still requires physical validation.

## Gemini safeguards

`POST /api/gesture/resolve` accepts a strict command or compact gesture telemetry object; unknown fields, images and large payloads are rejected. Output is a validated action enum, never code. Local confidence ≥0.75, ambiguity <900 ms, and active pinching do not call Gemini. The optional fallback considers only a slow ambiguous horizontal sweep over the module region; it is disabled by default. Stale decisions cannot interrupt an active gesture.

Limits: 5-second cooldown, 8 HTTP requests/minute/IP, one provider request in flight, 6-second SDK timeout, one attempt (no automatic retry loop), 60-second/100-entry cache, 96 output tokens, 12-call ceiling and 2,000 measured-token process budget with a 512-token preflight reserve. Token accounting uses provider usage when available, conservative estimates on failure. The provider's actual tokenization can vary; use provider billing quotas as the final financial ceiling. Client debug counters show attempts and actual returned token usage, plus an explicitly estimated cache saving.

The server budget is deliberately global and resets when the process restarts. For a public multi-user service, add authenticated sessions, shared Redis rate limits/budgets, persistent daily spend limits and a provider billing cap. Configure `APP_ORIGIN` to exactly match the public origin. Origin checks are not authentication.

## Tests

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Use an existing Chrome installation if desired:

```powershell
$env:PLAYWRIGHT_CHANNEL='chrome'
npm run test:browser
```

Unit tests replay synthetic landmarks for smoothing, normalized pinch, one-click lifecycle, hysteresis, debounce, drag/swipe exclusion, both swipe directions, zoom in/out, loss/reacquisition, confidence filtering, crossing identities, calibration, camera cancellation, AI caching/cooldown/budget and fallback gating. Browser tests use an explicitly fake video source for camera plumbing. This does **not** establish real-hand accuracy or physical mobile performance. See `QA-REPORT.md` for executed evidence and remaining acceptance checks.

## Production deployment

Use a Node host/container behind HTTPS; static-only hosting cannot keep the Gemini key server-side.

```powershell
npm ci
npm run assets
npm run build
$env:NODE_ENV='production'
$env:PORT='4317'
$env:APP_ORIGIN='https://your-domain.example'
# Set GEMINI_API_KEY through your host's secret manager, not a source file.
npm start
```

The server serves `dist` and `/api` from the same origin. Put an HTTPS reverse proxy in front of port 4317. Pass `Host` and use TLS on the public endpoint. The current rate limiter uses the direct peer IP; when deployed behind a proxy, configure a verified trust-proxy policy rather than blindly trusting arbitrary forwarded headers. Without that configuration, proxied users share an IP limit (safe but restrictive).

Or build/run the supplied Docker image:

```sh
docker build -t aether .
docker run --rm -p 4317:4317 --env-file .env -e NODE_ENV=production -e APP_ORIGIN=https://your-domain.example aether
```

Store the API key in the runtime environment only. `dist/assets` includes no `@google/genai` SDK or key. The model and WASM files are relatively large; enable gzip/Brotli for JavaScript/CSS, HTTP caching for versioned assets, and test camera permissions under your actual HTTPS origin. Plain HTTP LAN URLs do not enable phone cameras; use an HTTPS development tunnel or a trusted TLS endpoint.

## Physical acceptance checklist

1. Desktop and phone: camera permission granted/denied, no-device, camera busy, rotation, switching, background/resume, disconnect/restart.
2. Verify physical right → screen right; physical left → screen left at two camera distances.
3. Verify slow precision, fast response, short occlusion persistence, one click per pinch, and release after tracking loss.
4. Move a tile without a carousel swipe; verify both swipe directions and two-hand zoom with no initial scale jump.
5. Complete the entire tutorial with a first-time user and log time/error rate; do not assert a universal 20–30-second completion time without observation.
6. Measure tracking/frame latency and memory over a 10-minute session on actual iOS Safari and Android Chrome. Emulated viewport testing is insufficient.
7. Verify Gemini counters remain zero during ordinary gestures, then separately validate a configured command under a small provider quota.

Further optimization: profile inference on real devices, evaluate the GPU delegate against worker CPU performance, cache model downloads with a versioned service worker if offline reload is needed, and add recorded real-hand datasets across lighting, skin tones, distances and occlusions before release certification.
