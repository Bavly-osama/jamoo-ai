# QA report — AETHER

Executed 2026-09-20. Claims below are limited to commands and sessions actually run.

## Automated

| Command | Result |
| --- | --- |
| `npm test` | 6 files, **37 passed** (1.01s) |
| `npx tsc --noEmit && vite build` | exit 0; client bundle 44 kB + three 479 kB; no `GEMINI_API_KEY` / `@google/genai` in `dist` |
| `npx playwright test` | **7 passed** (1.3m), Chromium, fake camera device |

Unit coverage includes pinch normalization, mirroring, one-click debounce, hysteresis, drag/swipe exclusion, both swipe directions, zoom in/out, tracking-loss drop, low-confidence reject, hand identity, One Euro jitter vs fast motion, Gemini budget/cache/cooldown, fallback gating, camera cancellation, calibration, open-palm cancel, and quality recovery.

Playwright: welcome → mouse preview → inspection → diagnostics; mobile 390×844 no horizontal overflow; **Gemini HTTP calls = 0**; fake-camera frames arrive and MediaPipe initializes; no-hand video does not skip onboarding; synthetic-hand worker completes every tutorial gate; permission denial recovers; 30s soak: DOM node count stable, heap sample not growing in that window, AI requests 0.

Headless camera metrics (fake device, CPU delegate, parallel workers): Camera FPS 17.7, render 18.7, tracking 8.6, inference 78.5 ms, quality LOW. Not a physical-device measurement.

## Live Chromium (Cursor browser)

Mouse preview: circular menu CORE / ATLAS / SCAN / SYS switches 3D objects; overlay labels update; render **60 FPS**, quality **HIGH**; no `window` error events during the session.

Enable camera in this embedded browser: **NotFoundError** path shown (“No camera found. Connect a camera and try again.”). No webcam is attached to that browser, so physical left/right, pinch-once, drag-vs-swipe, and two-hand zoom were **not** executed with a real hand here.

Playwright’s fake-camera test is plumbing only.

## Gemini

All automated and live-preview sessions: **geminiCalls = 0**, input/output tokens 0. Live `/api/gesture/resolve` with a configured key was not exercised.

## Still required before calling the product finished

1. Real webcam, two distances: physical right → pointer right, left → left.
2. One physical pinch = one click; hold-drag does not swipe; two-hand zoom does not jump.
3. Temporary occlusion (~300 ms) keeps the pointer visible.
4. First-time user completes the gated tutorial.
5. iOS Safari / Android Chrome 10-minute FPS + memory.
6. Optional: one command and one ambiguous-gesture fallback with a small Gemini quota.
