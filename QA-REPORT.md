# JARVIS upgrade QA — 2026-09-21

Full physical acceptance is **pending**. Real-hand accuracy, poor lighting, phone cameras, microphone accuracy and audible speech playback are **NOT HARDWARE TESTED**. No real pinch video was supplied. Synthetic landmarks do not establish real-hand usability.

## Architecture and implementation

The existing TypeScript/Vite app, MediaPipe worker, camera controller, One Euro smoother, Three.js scene and single render loop were retained.

| Area / files | Change |
| --- | --- |
| `src/tracking/PinchDetector.ts`, `GestureEngine.ts` | Palm-normalized 3D geometry, index PIP/thumb IP directions, relative closing velocity, pose and temporal confidence. OPEN → POSSIBLE_PINCH → PINCHING → PINCH_CONFIRMED → HOLDING → RELEASING. Multiple frames and elapsed time confirm; separate release threshold plus 70 ms separation releases. One click per held pinch. |
| `src/main.ts`, `HandSmoother.ts`, `HandTracker.ts` | Stale detections no longer count as fresh observations. Pointer prediction/fade, safe drop after 300 ms, rearm after hand replacement, applied dead zone, worker inference prioritized over graphic quality. |
| `CalibrationManager.ts`, `TutorialController.ts` | Nine action-gated stages: camera, target, left/right, pinch, hold, drag, navigation, two-hand zoom apart/together, voice. Explicit optional zoom/microphone skips are recorded, not counted as passes. |
| `src/interaction/CarouselController.ts` | Hand displacement plus filtered velocity, velocity cap, friction and edge spring resistance. Physical right maps to rightward carousel movement. |
| `Workspace.ts`, `InteractionManager.ts` | Ten modules, mouse/touch/keyboard fallbacks, exclusive navigation/pointer/drag/zoom/voice modes. Exact targets take priority over expanded hit areas. |
| `src/scene/JarvisScene.ts`, `src/style.css` | Animated module opening, hover targeting, globe coordinate picking, manual rotation, graphics context recovery, responsive activity and assistant layers. |
| `src/ai/LocalCommands.ts`, `AssistantService.ts`, `VoiceController.ts` | Local commands make no Gemini calls. Knowledge questions stream; speech recognition and synthesis have text/error fallbacks. LISTENING / PROCESSING / SPEAKING / IDLE visualization. |
| `server/assistant.ts`, `server/index.ts`, `api/assistant.ts` | Shared Express/Vercel streaming endpoint, server-only key, validated bounded inputs, origin check, timeout, concurrency and process-level budgets. |
| `tests/*`, `tests/browser/*` | Regression, A–H synthetic scenarios, seeded imperfect interactions, browser tutorial/module/voice/API tests. |

Activities: Energy Core rotation/scale; Earth Scan rotation/coordinate selection/scale; selectable and draggable Mission Control objects and Files; live Diagnostics/System Status; AI Assistant; simulated Armor power allocation; Network server check; Camera restart/switch controls. Simulated data is labeled. The globe is illustrative, not a geographic dataset.

Calibration stores close/release thresholds, hand scale, observed movement range and camera zone, mean pinch duration, sensitivity, dead zone, average velocity, dominant hand and skipped stages. Sensitivity and dead zone are applied. Developer controls adjust and persist pinch thresholds; the landmark overlay shows the tip-distance line, ratio, confidence and state.

Gemini optimization: local classification first; four bounded context messages; 512 output-token cap; 20-second client timeout; 18-second server timeout; standalone-question cache; client session ceiling; server concurrency and process-local budget. Token counters stay in developer mode. The active UI has no gesture-to-Gemini path. Speech starts with Listen; this is not an always-on wake-word detector.

## Executed QA

| Test | Expected | Actual | Pass/Fail |
| --- | --- | --- | --- |
| Unit suite | All regression and replay tests pass | 80/80 passed in final verification | PASS |
| Final browser suite | Browser workflows and HTTP checks pass | 10 passed, 1 skipped (provider is configured), 1.7 minutes | PASS — stated fixtures |
| Production build | TypeScript and Vite succeed | Build completed | PASS |
| Near/far open hand | No click across 0.25–2× scale | Four scale regressions pass | PASS — synthetic |
| Brief/cancelled pinch | No single-frame or missing-frame click | Regression tests pass | PASS — synthetic |
| Click/hold/drag/release | One click and drop per hold | Long-pinch replay passes | PASS — synthetic |
| Rotated pinch | Stable at four angles | One confirmation per tested angle | PASS — synthetic |
| Left/right mapping | Physical right maps right | Mirroring and carousel tests pass | PASS — synthetic |
| Inertia and edges | Bounded motion settles | Controller test passes | PASS — synthetic |
| Pointer jitter, slow/fast motion | Finite, smoothed coordinates | Replay tests pass | PASS — synthetic |
| Drag/swipe exclusion | No swipe while dragging | Replay tests pass | PASS — synthetic |
| Two-hand zoom | Smooth in/out, no click on exit | Zoom and rearm tests pass | PASS — synthetic |
| Tracking loss/replacement | Fade, safe drop, no repeated click | Recovery tests pass | PASS — synthetic |
| Persons A–H | Slow, fast, close, far, low confidence, loss, reversal, mobile geometry | Eight parameterized replays pass | PASS — synthetic, not physical people |
| Imperfect behavior | No non-finite position or repeated held click | Seeded 600-frame replay passes | PASS — synthetic |
| Camera start/no hand | Changing frames, MediaPipe loads, tutorial waits | Fake camera and real model initialize; no-hand setup remains gated | PASS — fake camera |
| Permission denial | Recovery and preview work | Browser test passes | PASS — simulated denial |
| Tutorial | Verify each hand stage | All eight hand stages complete; microphone explicitly skipped | PASS — synthetic hand stages |
| Continuous hand workflow | Tutorial → pinch Earth → hold/rotate → pinch Back, no refresh | Browser scenario passes | PASS — synthetic |
| Back target | Projection padding must not steal button hits | Regression and browser scenario pass | PASS |
| Activities/fallback | Ten modules open/close; file drag works | Browser walkthrough passes | PASS — mouse/browser |
| Mobile layout | Portrait/landscape document fits | 390×844 and 844×390 checks pass | PASS — viewport only |
| Local commands | Zero Gemini calls | Unit/browser assertions pass | PASS |
| Streaming/cache/API error | Incremental text, cache reuse, recovery | Unit/browser tests pass | PASS — mocked provider |
| Voice routing/output | Transcript → action/question → synthesis | Stub speech API tests pass | PASS — simulated APIs |
| Unsupported speech | Text/local commands remain usable | Browser fallback passes | PASS — simulated APIs |
| Live Gemini | Real answer appears | Manual quantum-computing request returned text; UI entered SPEAKING | PASS — provider; audible playback unverified |
| API validation | Reject foreign origins, images, oversized context | Endpoint tests pass | PASS |
| Real pinch video | Adapt to user's actual movement | Video not provided | NOT HARDWARE TESTED |
| Real camera/phone/lighting | Reliable physical interaction | No physical test session | NOT HARDWARE TESTED |
| Microphone/speakers | Accurate transcription and audible output | No acoustic verification | NOT HARDWARE TESTED |

## Performance evidence

The final ten-second steady-state browser soak kept DOM nodes at 363 before/after, sampled 46.2–49.2 render FPS and recorded zero AI traffic. Both heap readings reported 10 MB; this coarse measurement does not prove absence of leaks. The final fake-camera run recorded approximately 15.2 camera/render FPS, 7.5 tracking FPS and 75.5 ms inference, with graphics reduced to LOW. An earlier idle soak sampled 52.1–57.0 FPS. Startup/concurrent runs varied. These results describe this host, not physical phones.

Tracking runs in a worker with one frame in flight; Gemini requests are asynchronous. Expensive inference reduces graphics first. Dedicated long-duration, per-activity hardware profiles for pointer, carousel, opening, drag, zoom, voice and AI are still outstanding.

## Known limitations / remaining acceptance

- Obtain the pinch video and measure real false-positive/false-negative rates across people, distances, lighting and phones. Low-confidence synthetic data is not a poor-light camera test.
- Verify actual microphones, speakers, mobile front/back cameras, permissions, orientation, background/foreground, disconnect/restart and physical touch interaction.
- WebGL context recovery is implemented but not hardware fault-tested.
- The camera zone is recorded but does not remap the entire pointer coordinate system. Re-enabling the camera currently repeats onboarding.
- Current weather has no live weather integration. The assistant is instructed not to invent it. Browser recognition support and speech-service behavior vary; errors require Listen to retry.
- Server budgets are process-local and reset on restart/serverless cold start. Distributed quotas/authentication remain deployment work.
- Playwright's native API-request fixture repeatedly crashed before the test body on this Windows host (exit 3221226505). Endpoint tests now use Node fetch against the same server and pass. The unconfigured-provider test is skipped when a real key is configured.

Reproduce with `npm test`, `npm run build`, and `npx playwright test --workers=1`. Browser fixtures deliberately distinguish synthetic hands, fake video, mock speech and mock provider responses. The live Gemini request was a separate manual browser check.
