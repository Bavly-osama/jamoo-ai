import "./style.css";
import { CameraController, cameraError } from "./tracking/CameraController";
import { HandTracker } from "./tracking/HandTracker";
import {
  GestureEngine,
  clamp,
  distance,
  type Hand,
  type TrackingState,
} from "./tracking/GestureEngine";
import { CalibrationManager } from "./tracking/CalibrationManager";
import { InteractionManager } from "./interaction/InteractionManager";
import { EdgeScrollController } from "./interaction/EdgeScrollController";
import { JarvisScene } from "./scene/JarvisScene";
import { PerformanceMonitor } from "./performance/PerformanceMonitor";
import { GeminiCommandService } from "./ai/GeminiCommandService";
import { GeminiGestureResolver } from "./ai/GeminiGestureResolver";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
document.querySelector("#app")!.innerHTML = `
<main class="app-shell">
 <header class="topbar"><div class="brand"><div class="brand-symbol"></div><div><div class="brand-name">AETHER</div><small>SPATIAL INTELLIGENCE</small></div></div><div class="top-divider"></div><div class="system-label">NEURAL INTERFACE<br>PERSONAL WORKSPACE / 01</div><div class="top-right"><div class="status" id="connection"><i></i><span>STANDBY</span></div><button class="utility" id="camera-toggle">Enable camera</button><button class="utility" id="diagnostics" aria-label="Diagnostics" data-target="diagnostics">Diagnostics</button></div></header>
 <div class="workspace"><div class="workspace-heading"><div><div class="eyebrow">YOUR SPACE. YOUR CONTROL.</div><h1>Beyond the screen.</h1></div><div class="coordinates">SPATIAL ENVIRONMENT / ACTIVE<br><span id="clock">00:00:00</span> LOCAL TIME</div></div>
 <div class="workspace-grid">
  <aside class="side-stack"><section class="instrument"><div class="instrument-title"><span>REACTOR OUTPUT</span><span class="tiny">SIM</span></div><div class="big">4.82 <small>GW</small></div><svg class="energy-chart" viewBox="0 0 230 60" preserveAspectRatio="none" aria-label="Simulated reactor output"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#80e5ec" stop-opacity=".2"/><stop offset="1" stop-color="#80e5ec" stop-opacity="0"/></linearGradient></defs><path d="M0 45 15 45 22 34 36 38 42 18 51 34 66 31 77 35 85 15 94 29 111 26 123 30 135 17 142 25 156 21 165 28 177 12 187 23 205 18 217 22 230 10V60H0Z" fill="url(#fill)"/><path d="M0 45 15 45 22 34 36 38 42 18 51 34 66 31 77 35 85 15 94 29 111 26 123 30 135 17 142 25 156 21 165 28 177 12 187 23 205 18 217 22 230 10" fill="none" stroke="#80cbd6" stroke-width="1.2"/></svg><div class="metric"><span>Core stability</span><b>98.6%</b></div></section>
  <section class="instrument"><div class="instrument-title"><span>SYSTEM INTEGRITY</span><span class="tiny">LIVE</span></div><div class="metric"><span>Rendering</span><b id="render-label">Initializing</b></div><div class="meter"><span id="render-meter"></span></div><div class="metric"><span>Hand tracking</span><b id="tracking-label">Offline</b></div><div class="metric"><span>Processing</span><b>On device</b></div><div class="metric"><span>Quality</span><b id="quality-label">Adaptive</b></div></section></aside>
  <section class="core-stage" aria-label="Interactive hologram"><div class="scene" id="scene"></div><div class="core-top">HOLOGRAPHIC OBJECT / <span id="object-code">ARC–001</span></div><button class="reactor-control" id="core" data-target="core" aria-label="Inspect reactor"><span class="core-caption">NEURAL CORE</span><span class="core-word">AETHER</span><span class="core-id">SYNCHRONIZED · READY</span></button><nav class="orbit-menu" aria-label="Circular hologram menu">${[["core-module", "CORE", "-90deg"], ["globe", "ATLAS", "0deg"], ["scanner", "SCAN", "90deg"], ["systems", "SYS", "180deg"]].map(([id, label, a], i) => `<button class="orbit-node${i === 0 ? " active" : ""}" data-target="${id}" data-module-index="${i}" style="--a:${a}">${label}</button>`).join("")}</nav><div class="scale-indicator" id="scale" hidden><span>1.00×</span></div><div class="core-bottom"><p id="object-title">Arc reactor</p><span class="tiny" id="object-hint">PINCH TO INSPECT · TWO HANDS TO RESIZE</span></div></section>
  <aside class="side-stack"><section class="instrument"><div class="instrument-title"><span>PROXIMITY SCANNER</span><span class="tiny">SIM</span></div><div class="radar"><div class="radar-sweep"></div><i class="radar-dot" style="left:64%;top:32%"></i><i class="radar-dot" style="left:28%;top:62%"></i><i class="radar-dot" style="left:55%;top:73%"></i></div><div class="radar-label"><span>SECTOR 07</span><span>3 SIGNALS</span></div></section><section class="instrument"><div class="instrument-title"><span>NEURAL LINK</span><span class="tiny" id="link-mode">LOCAL</span></div><div class="signal-bars">${Array.from({ length: 34 }, (_, i) => `<i style="--h:${8 + Math.sin(i * 1.7) ** 2 * 25}px"></i>`).join("")}</div><div class="readout" style="margin-top:15px">Awaiting your next move.<br><em id="gesture-label">Mouse preview available</em></div></section></aside>
 </div>
 <section class="module-section" aria-label="Holographic modules"><div class="section-row"><div class="eyebrow">CONNECTED MODULES <span style="color:#4f7582">/ 04</span></div><div class="carousel-nav"><span>SWIPE TO EXPLORE</span><button class="arrow" id="previous" aria-label="Previous module" data-target="previous">←</button><span id="module-count">01 / 04</span><button class="arrow" id="next" aria-label="Next module" data-target="next">→</button></div></div><div class="modules">
 ${[
   ["core-module", "◎", "Arc reactor", "ENERGY SYSTEM", "01"],
   ["globe", "◉", "Orbital atlas", "SPATIAL MAPPING", "02"],
   ["scanner", "⌖", "Target scanner", "PROXIMITY ANALYSIS", "03"],
   ["systems", "⌁", "System diagnostics", "INTERFACE TELEMETRY", "04"],
 ]
   .map(
     ([id, icon, title, label, n], i) =>
       `<button class="module ${i === 0 ? "active" : ""}" id="${id}" data-target="${id}" data-draggable="true"><span class="module-index">${n}</span><span class="module-icon">${icon}</span><div><h3>${title}</h3><p>${label}</p></div></button>`,
   )
   .join("")}
 </div></section>
 <form class="command-bar" id="command"><div class="ai-orb">✦</div><label for="command-input">AETHER AI</label><input id="command-input" maxlength="240" autocomplete="off" placeholder="Try “open system diagnostics”" aria-label="AI command"><button type="submit" id="command-send">Send ↗</button></form>
 <footer class="footer"><div class="footer-left"><span>CONTROL <b id="control-mode">STANDBY</b></span><span>RENDER <b id="fps">—</b></span><span>BUILD <b>1.0.0</b></span></div><div class="privacy">Your camera stays on your device</div></footer></div>
</main>
<section class="welcome" id="welcome" aria-labelledby="welcome-title"><div class="welcome-panel"><div class="welcome-mark">⌁</div><div class="eyebrow">WELCOME TO AETHER</div><h2 id="welcome-title">A little less interface.<br>A lot more instinct.</h2><p id="setup-status" role="status">Move your hand to explore. Pinch to select.<br>Your workspace is a gesture away.</p><div class="setup-progress" id="setup-progress" hidden><span></span></div><button class="primary" id="enable">Enable camera</button><button class="secondary" id="preview">Explore with mouse</button><button class="secondary" id="cancel" hidden>Cancel setup</button><button class="tutorial-target" id="tutorial-target" data-target="tutorial" data-draggable="true" hidden>Pinch or tap here</button><div class="welcome-note">CAMERA PROCESSED LOCALLY · NO VIDEO UPLOADS<br>Good light. One hand. A little room to move.</div></div></section>
<div class="camera-preview" id="camera-preview" hidden><video id="video" muted playsinline></video><canvas id="landmarks"></canvas><span id="camera-caption">LOCAL CAMERA</span></div><div id="pointer" class="pointer" style="opacity:0"></div>
<aside class="drawer" id="inspection" hidden aria-label="Object inspection"><button class="close" id="close-inspection" aria-label="Close inspection" data-target="close-inspection">×</button><div class="eyebrow">OBJECT INSPECTION</div><h2 id="inspection-title">Arc reactor / ARC–001</h2><p id="inspection-description">A self-contained holographic energy core. Spread two pinched hands to expand the projection.</p><div class="metric"><span>Projection scale</span><b id="inspection-scale">1.00×</b></div><div class="metric"><span>Rotation</span><b id="rotation-label">Active</b></div><button class="utility" id="rotate" data-target="rotate">Pause rotation</button><button class="utility" id="reset" data-target="reset">Reset workspace</button><p>Module tiles can be moved by pinching and holding. Release your pinch to place them.</p></aside>
<aside class="drawer" id="debug" hidden aria-label="Developer diagnostics"><button class="close" id="close-debug" aria-label="Close diagnostics" data-target="close-debug">×</button><div class="eyebrow">DEVELOPER VIEW / SHIFT + D</div><h2>System diagnostics</h2><pre id="debug-data"></pre><label>minCutoff<input type="range" id="minCutoff" min=".5" max="5" step=".1" value="1.6"></label><label>beta<input type="range" id="beta" min="0" max="2" step=".05" value=".35"></label><label>dCutoff<input type="range" id="dCutoff" min=".5" max="3" step=".1" value="1"></label><label>Show landmarks<input type="checkbox" id="show-landmarks"></label><label>AI gesture fallback<input type="checkbox" id="ai-fallback"></label><button class="utility" id="recalibrate">Recalibrate hand</button><button class="utility" id="switch-camera">Switch front / back camera</button><button class="utility" id="restart-camera">Restart camera</button><p>Hand confidence is the model’s handedness score; detection and presence use separate internal thresholds. Reactor and scanner values are simulated.</p></aside><div class="toast" id="toast" role="status" hidden></div>`;

$("welcome").setAttribute("role", "dialog");
$("welcome").setAttribute("aria-modal", "true");
const shell = document.querySelector<HTMLElement>(".app-shell")!;
shell.inert = true;
new MutationObserver(() => {
  shell.inert = !$("welcome").hidden;
}).observe($("welcome"), { attributes: true, attributeFilter: ["hidden"] });
$("enable").focus();
document.addEventListener("keydown", (event) => {
  if (event.key !== "Tab" || $("welcome").hidden) return;
  const controls = [
    ...$("welcome").querySelectorAll<HTMLButtonElement>("button"),
  ].filter((button) => !button.hidden && !button.disabled);
  const first = controls[0],
    last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
});
const video = $<HTMLVideoElement>("video"),
  camera = new CameraController(video),
  tracker = new HandTracker(),
  engine = new GestureEngine(),
  interaction = new InteractionManager(),
  perf = new PerformanceMonitor(),
  ai = new GeminiCommandService(),
  resolver = new GeminiGestureResolver(ai);
const edgeScroll = new EdgeScrollController();
let scene: JarvisScene | undefined;
try {
  scene = new JarvisScene($("scene"));
} catch {
  $("scene").innerHTML = '<div class="scene-fallback"></div>';
  toast("WebGL is unavailable. Using a simple hologram.");
}
let setupGeneration = 0,
  running = false,
  starting = false,
  mode: "standby" | "mouse" | "hand" = "standby",
  state: TrackingState | undefined,
  lastHands: Hand[] = [],
  lastResult = -Infinity,
  lastFrame = performance.now(),
  lastDebug = 0,
  zoomStartScale = 1,
  wasZoom = false,
  activeModule = 0;
let calibration = new CalibrationManager(),
  step = -1,
  stepSince = 0,
  moveMin = 1,
  moveMax = 0,
  dragOrigin = { x: 0, y: 0 },
  zoomSeen = false,
  openSince = 0,
  tutorialPinched = false;
let toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 4500);
}
function status(message: string, error = false) {
  $("setup-status").textContent = message;
  $("setup-status").classList.toggle("error-text", error);
}
function setMode(value: typeof mode) {
  mode = value;
  $("control-mode").textContent =
    value === "hand"
      ? "HAND TRACKING"
      : value === "mouse"
        ? "MOUSE PREVIEW"
        : "STANDBY";
  $("connection").classList.toggle("live", value !== "standby");
  $("connection").querySelector("span")!.textContent =
    value === "hand"
      ? "LINK ESTABLISHED"
      : value === "mouse"
        ? "PREVIEW MODE"
        : "STANDBY";
}
function stopCamera() {
  setupGeneration++;
  running = false;
  starting = false;
  camera.stop();
  tracker.dispose();
  lastHands = [];
  lastResult = -Infinity;
  engine.update([], performance.now() + 1000, null);
  interaction.release();
  $("pointer").style.opacity = "0";
  $("camera-preview").hidden = true;
  $("camera-toggle").textContent = "Enable camera";
  $("tracking-label").textContent = "Offline";
}
async function startCamera() {
  if (starting) return;
  const generation = ++setupGeneration;
  starting = true;
  setMode("standby");
  step = -1;
  $("welcome").hidden = false;
  $("enable").hidden = true;
  $("preview").hidden = true;
  $("cancel").hidden = false;
  $("tutorial-target").hidden = true;
  $("setup-progress").hidden = false;
  status("Connecting to your camera…");
  try {
    const started = await camera.start();
    if (!started || !starting || generation !== setupGeneration) return;
    $("camera-preview").hidden = false;
    status("Camera connected. Loading local hand tracking…");
    await tracker.init();
    if (!starting || generation !== setupGeneration) return;
    running = true;
    starting = false;
    engine.mirrored = camera.facing === "user";
    engine.smoother.reset();
    const saved = CalibrationManager.load();
    // Prefer a forgiving live default during onboarding; saved thresholds apply after completion.
    engine.enter = 0.72;
    engine.exit = 0.88;
    engine.openBaseline = 0.95;
    engine.easyMode = true;
    if (saved && saved.facing === camera.facing) {
      engine.enter = Math.max(saved.enter, 0.6);
      engine.exit = Math.max(saved.exit, engine.enter + 0.12);
    }
    calibration = new CalibrationManager();
    step = 0;
    stepSince = performance.now();
    openSince = 0;
    moveMin = 1;
    moveMax = 0;
    status("Raise your hand inside the camera view. Open your palm.");
    $("welcome-title").textContent = "Make the connection.";
    $("camera-toggle").textContent = "Disable camera";
    void fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        if (d?.aiEnabled) {
          resolver.enabled = true;
          $<HTMLInputElement>("ai-fallback").checked = true;
        }
      })
      .catch(() => {});
    camera.stream?.getVideoTracks()[0]?.addEventListener("ended", () => {
      if (running) {
        stopCamera();
        setMode("standby");
        toast("Camera disconnected. Enable the camera to reconnect.");
      }
    });
  } catch (e) {
    if (generation !== setupGeneration) return;
    stopCamera();
    $("enable").hidden = false;
    $("preview").hidden = false;
    $("cancel").hidden = true;
    $("setup-progress").hidden = true;
    status(
      (e as Error).message?.includes("camera") ||
        (e as Error).message?.includes("tracker")
        ? (e as Error).message
        : cameraError(e),
      true,
    );
  }
}
function advance() {
  step++;
  stepSince = performance.now();
  openSince = 0;
  $("setup-progress").querySelector<HTMLElement>("span")!.style.width =
    `${(step / 5) * 100}%`;
  const prompts = [
    "Raise your hand inside the camera view. Open your palm.",
    "Move your hand comfortably left, then right. The pointer follows your fingertip.",
    "Just pinch anywhere — thumb tip toward index tip. Or tap the button.",
    "Release, then pinch and hold the tile. Move it to either side.",
    "Release. Raise both hands and pinch with each. Spread them apart to resize.",
  ];
  status(prompts[step] ?? "Connection established. Welcome to your workspace.");
  $("tutorial-target").hidden = step < 2 || step > 3;
  if (step === 3) {
    tutorialPinched = false;
    dragOrigin = { ...engine.point };
  }
  if (step === 4) zoomSeen = false;
  if (step === 5) {
    const c = calibration.finish(camera.facing);
    engine.enter = Math.max(c.enter, 0.55);
    engine.exit = Math.max(c.exit, engine.enter + 0.12);
    engine.easyMode = false;
    CalibrationManager.save(c);
    $("welcome").hidden = true;
    step = -1;
    interaction.reset();
    setMode("hand");
    toast("You’re connected. Move, pinch, hold, release.");
  }
}
function nearTutorial(point: { x: number; y: number }) {
  if (step === 2) return true;
  const tile = $("tutorial-target");
  if (tile.hidden) return false;
  const r = tile.getBoundingClientRect();
  if (r.width === 0) return false;
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return Math.hypot(point.x * innerWidth - cx, point.y * innerHeight - cy) < 220;
}
function tutorialHit(point: { x: number; y: number }) {
  if (step === 2) return "tutorial";
  const direct = interaction.hit(point.x * innerWidth, point.y * innerHeight);
  if (direct) return direct;
  if (step === 3 && nearTutorial(point)) return "tutorial";
  return null;
}
function tutorial(s: TrackingState, t: number) {
  if (step < 0) return;
  const h = lastHands.find((h) => h.id === s.primaryId);
  if (!h || !s.visible || performance.now() - lastResult > 250) return;
  calibration.observe(
    s.raw.x,
    s.pinch,
    distance(h.landmarks[0], h.landmarks[9]),
  );
  if (s.pinch > 0.5)
    engine.openBaseline = Math.max(engine.openBaseline, s.pinch);
  const tile = $("tutorial-target");
  const progress = clamp(
    1 - s.pinch / Math.max(0.3, engine.openBaseline),
    0,
    1,
  );
  if (!tile.hidden) {
    tile.style.setProperty("--pinch", String(progress));
    tile.classList.toggle(
      "hovered",
      progress > 0.2 ||
        s.state === "PINCH_STARTING" ||
        s.state === "PINCHED" ||
        s.state === "DRAGGING",
    );
  }
  if (step === 0) {
    if (s.pinch > 0.45 && s.confidence >= 0.5) {
      openSince ||= t;
      if (t - openSince > 280) advance();
    } else openSince = 0;
  } else if (step === 1) {
    moveMin = Math.min(moveMin, s.raw.x);
    moveMax = Math.max(moveMax, s.raw.x);
    if (moveMax - moveMin > 0.14) advance();
  } else if (step === 2) {
    const closing =
      s.events.some((e) => e.type === "click") ||
      s.state === "PINCHED" ||
      s.state === "DRAGGING" ||
      (s.state === "PINCH_STARTING" && progress > 0.22) ||
      progress > 0.35;
    if (closing) {
      openSince ||= t;
      if (
        s.events.some((e) => e.type === "click") ||
        progress > 0.38 ||
        t - openSince > 160
      )
        advance();
      else status("Yes — keep pinching…");
    } else {
      openSince = 0;
      status("Pinch thumb toward index anywhere — or tap the big button.");
    }
  } else if (step === 3) {
    if (s.events.some((e) => e.type === "drop" || e.type === "click"))
      tutorialPinched = true;
    if (
      (tutorialPinched || s.state === "DRAGGING" || s.state === "PINCHED") &&
      (s.events.some((e) => e.type === "drag") ||
        distance(s.point, dragOrigin) > 0.04)
    )
      advance();
    else status("Pinch, hold, and move your hand a little to either side.");
  } else if (step === 4) {
    const z = s.events.find((e) => e.type === "zoom");
    if (z) {
      zoomSeen = true;
      if (z.scale! > 1.1) advance();
    }
    if (t - stepSince > 12000)
      status("You can skip zoom — pinch both hands apart, or cancel setup.");
  }
  if (step >= 0 && t - stepSince > 20000 && step === 4 && !zoomSeen)
    status(
      "Show both hands fully. Pinch with both, then spread apart. You can cancel setup to explore with a mouse.",
    );
}
tracker.onResult = (hands, time) => {
  lastHands = hands;
  lastResult = performance.now();
  state = engine.update(hands, time, tutorialHit);
  applyState(state, time);
  if (hands.length) {
    const region = document.querySelector(".modules")!.getBoundingClientRect();
    const overCarousel =
      state.point.y * innerHeight >= region.top &&
      state.point.y * innerHeight <= region.bottom;
    const context =
      step === 2
        ? "tutorial_pinch"
        : step < 0 && overCarousel
          ? "carousel"
          : "";
    const captured = activeModule;
    const tutorialStep = step;
    void resolver
      .observe(
        state.point,
        time,
        context,
        state.pinch,
        !["IDLE", "HOVERING", "PINCH_STARTING"].includes(state.state),
        state.hover === "tutorial" || nearTutorial(state.point),
      )
      .then((d) => {
        if (!d || d.confidence < 0.8) return;
        if (tutorialStep === 2 && step === 2 && d.action === "pinch_click") {
          advance();
          return;
        }
        if (
          step < 0 &&
          captured === activeModule &&
          state &&
          ["IDLE", "HOVERING"].includes(state.state)
        ) {
          if (d.action === "swipe_right") selectModule(activeModule + 1);
          if (d.action === "swipe_left") selectModule(activeModule - 1);
        }
      })
      .catch(() => {});
  }
};
tracker.onError = (message) => {
  stopCamera();
  setMode("standby");
  toast(message);
};
function applyState(s: TrackingState, time: number) {
  $("pointer").style.transform =
    `translate(${s.point.x * innerWidth}px,${s.point.y * innerHeight}px)`;
  $("pointer").style.opacity = String(s.opacity);
  $("pointer").classList.toggle(
    "pinched",
    ["PINCHED", "DRAGGING", "ZOOMING"].includes(s.state),
  );
  $("pointer").classList.toggle(
    "targeting",
    s.state === "HOVERING" || s.state === "PINCH_STARTING",
  );
  document
    .querySelectorAll("[data-target]")
    .forEach((el) =>
      el.classList.toggle(
        "hovered",
        (el as HTMLElement).dataset.target === s.hover,
      ),
    );
  for (const event of s.events) {
    interaction.handle(event);
    if (event.type === "click") {
      $("pointer").classList.remove("pulse");
      void $("pointer").offsetWidth;
      $("pointer").classList.add("pulse");
    }
    if (event.type === "cancel" && step < 0) {
      const open = !$("inspection").hidden || !$("debug").hidden;
      $("inspection").hidden = true;
      $("debug").hidden = true;
      if (open) toast("Panel closed.");
    }
    if (event.type === "swipe" && step < 0)
      selectModule(activeModule + (event.direction === "right" ? 1 : -1));
    if (event.type === "zoom" && scene) {
      if (!wasZoom) zoomStartScale = scene.scale;
      scene.scale = Math.max(0.5, Math.min(1.7, zoomStartScale * event.scale!));
      $("scale").querySelector("span")!.textContent =
        scene.scale.toFixed(2) + "×";
    }
  }
  wasZoom = s.state === "ZOOMING";
  $("scale").hidden = !wasZoom;
  $("gesture-label").textContent = s.visible
    ? s.state.toLowerCase().replaceAll("_", " ")
    : "Raise your hand";
  $("tracking-label").textContent = s.visible ? "Connected" : "Searching";
  $("scene").classList.toggle(
    "proximate",
    s.visible && Math.hypot(s.point.x - 0.5, s.point.y - 0.45) < 0.2,
  );
  tutorial(s, time);
}
function selectModule(index: number) {
  activeModule = (index + 4) % 4;
  document
    .querySelectorAll(".module")
    .forEach((el, i) => el.classList.toggle("active", i === activeModule));
  $("module-count").textContent = `0${activeModule + 1} / 04`;
  if (scene)
    scene.focus = (["core", "globe", "scanner", "systems"] as const)[
      activeModule
    ];
  document
    .querySelectorAll(".orbit-node")
    .forEach((el, i) => el.classList.toggle("active", i === activeModule));
  document.querySelector(".core-caption")!.textContent = [
    "NEURAL CORE",
    "ORBITAL MAP",
    "SECTOR 07",
    "TELEMETRY",
  ][activeModule];
  document.querySelector(".core-word")!.textContent = [
    "AETHER",
    "ATLAS",
    "SCAN",
    "LINK",
  ][activeModule];
  $("object-title").textContent = [
    "Arc reactor",
    "Orbital atlas",
    "Target scanner",
    "System diagnostics",
  ][activeModule];
  $("object-code").textContent = ["ARC–001", "ORB–002", "SCN–003", "SYS–004"][
    activeModule
  ];
  if (activeModule === 2) {
    $("inspection").hidden = false;
    $("inspection-title").textContent = "Target scanner / SCN–003";
    $("inspection-description").textContent =
      "Three simulated signals in sector 07. This is a holographic scene element, not real environment sensing.";
  } else if (activeModule === 3) $("debug").hidden = false;
}
function inspect() {
  $("inspection").hidden = false;
  $("inspection-title").textContent =
    activeModule === 1 ? "Orbital atlas / ORB–002" : "Arc reactor / ARC–001";
  $("inspection-description").textContent =
    activeModule === 1
      ? "A procedural orbital map. Pinch with both hands and spread to enlarge."
      : "A self-contained holographic energy core. Spread two pinched hands to expand the projection.";
}
function reset() {
  interaction.reset();
  if (scene) {
    scene.scale = 1;
    scene.rotationSpeed = 1;
  }
  selectModule(0);
  $("rotate").textContent = "Pause rotation";
  $("rotation-label").textContent = "Active";
  toast("Workspace reset.");
}
function toggleDebug() {
  $("debug").hidden = !$("debug").hidden;
}
$("enable").onclick = () => void startCamera();
$("tutorial-target").onclick = () => {
  if (step === 2) advance();
};
$("preview").onclick = () => {
  $("welcome").hidden = true;
  setMode("mouse");
};
$("cancel").onclick = () => {
  stopCamera();
  step = -1;
  $("enable").hidden = false;
  $("preview").hidden = false;
  $("cancel").hidden = true;
  $("tutorial-target").hidden = true;
  status("Setup cancelled. Enable your camera or explore with a mouse.");
};
$("camera-toggle").onclick = () => {
  if (running) {
    stopCamera();
    setMode("mouse");
  } else void startCamera();
};
$("core").onclick = inspect;
$("diagnostics").onclick = toggleDebug;
$("close-debug").onclick = () => ($("debug").hidden = true);
$("close-inspection").onclick = () => ($("inspection").hidden = true);
document.querySelectorAll<HTMLElement>("[data-module-index]").forEach((el) => {
  el.onclick = () => selectModule(Number(el.dataset.moduleIndex));
});
["core-module", "globe", "scanner", "systems"].forEach(
  (id, i) => ($(id).onclick = () => selectModule(i)),
);
$("previous").onclick = () => selectModule(activeModule - 1);
$("next").onclick = () => selectModule(activeModule + 1);
$("reset").onclick = reset;
$("rotate").onclick = () => {
  if (!scene) return;
  scene.rotationSpeed = scene.rotationSpeed ? 0 : 1;
  $("rotate").textContent = scene.rotationSpeed
    ? "Pause rotation"
    : "Resume rotation";
  $("rotation-label").textContent = scene.rotationSpeed ? "Active" : "Paused";
};
$("recalibrate").onclick = () => {
  stopCamera();
  void startCamera();
};
$("restart-camera").onclick = () => {
  stopCamera();
  void startCamera();
};
$("switch-camera").onclick = () => {
  stopCamera();
  camera.facing = camera.facing === "user" ? "environment" : "user";
  void startCamera();
};
for (const key of ["minCutoff", "beta", "dCutoff"] as const)
  $<HTMLInputElement>(key).oninput = (e) =>
    (engine.smoother[key] = Number((e.target as HTMLInputElement).value));
$<HTMLInputElement>("ai-fallback").onchange = (e) =>
  (resolver.enabled = (e.target as HTMLInputElement).checked);
document.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input")) return;
  if (e.shiftKey && e.key.toLowerCase() === "d") toggleDebug();
  if (e.key === "Escape") {
    $("inspection").hidden = true;
    $("debug").hidden = true;
    interaction.release();
  }
  if (e.key === "ArrowRight") selectModule(activeModule + 1);
  if (e.key === "ArrowLeft") selectModule(activeModule - 1);
});
$("command").onsubmit = async (e) => {
  e.preventDefault();
  const input = $<HTMLInputElement>("command-input");
  if (!input.value.trim()) return;
  $<HTMLButtonElement>("command-send").disabled = true;
  $("link-mode").textContent = "RESOLVING";
  try {
    const decision = await ai.request({
      kind: "command",
      text: input.value.trim(),
    });
    if (!decision || decision.confidence < 0.7 || decision.action === "NONE") {
      toast("Command unclear. Try “open diagnostics” or “reset scene”.");
      return;
    }
    switch (decision.action) {
      case "OPEN_DIAGNOSTICS":
      case "SHOW_STATS":
        $("debug").hidden = false;
        break;
      case "RESET_SCENE":
        reset();
        break;
      case "CLOSE_PANEL":
        $("inspection").hidden = true;
        $("debug").hidden = true;
        break;
      case "ROTATE_OBJECT":
        $("rotate").click();
        break;
      case "FOCUS_OBJECT":
        selectModule(decision.target === "globe" ? 1 : 0);
        break;
      case "OPEN_PANEL":
        if (decision.target === "diagnostics") $("debug").hidden = false;
        else inspect();
        break;
    }
    toast("Command applied.");
    input.value = "";
  } catch (err) {
    toast((err as Error).message);
  } finally {
    $<HTMLButtonElement>("command-send").disabled = false;
    $("link-mode").textContent = "LOCAL";
  }
};
// Pointer and keyboard fallback remain available independently of the camera.
let mouseGrab: string | null = null;
document.addEventListener("pointerdown", (e) => {
  if (mode !== "mouse") return;
  const target = (e.target as HTMLElement).closest<HTMLElement>(
    '[data-draggable="true"]',
  );
  if (target) {
    mouseGrab = target.dataset.target!;
    interaction.handle({
      type: "click",
      target: mouseGrab,
      point: { x: e.clientX / innerWidth, y: e.clientY / innerHeight },
    });
    target.setPointerCapture(e.pointerId);
  }
});
document.addEventListener("pointermove", (e) => {
  if (mouseGrab)
    interaction.handle({
      type: "drag",
      target: mouseGrab,
      point: { x: e.clientX / innerWidth, y: e.clientY / innerHeight },
    });
});
document.addEventListener("pointerup", () => {
  if (mouseGrab) {
    interaction.release();
    mouseGrab = null;
  }
});
document.addEventListener("pointercancel", () => {
  interaction.release();
  mouseGrab = null;
});
$("core").addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    if (scene)
      scene.scale = Math.max(
        0.5,
        Math.min(1.7, scene.scale - e.deltaY * 0.001),
      );
  },
  { passive: false },
);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && running) {
    stopCamera();
    setMode("standby");
    toast("Camera paused while away. Enable camera to resume.");
  }
});
window.addEventListener("pagehide", () => {
  stopCamera();
  scene?.dispose();
});
window.addEventListener("orientationchange", () => {
  interaction.reset();
  engine.smoother.reset();
});
const landmarkCanvas = $<HTMLCanvasElement>("landmarks"),
  ctx = landmarkCanvas.getContext("2d")!;
function drawLandmarks() {
  landmarkCanvas.width = 320;
  landmarkCanvas.height = 240;
  if ($("debug").hidden || !$<HTMLInputElement>("show-landmarks").checked)
    return;
  ctx.fillStyle = "#b0faff";
  for (const h of lastHands)
    for (const p of h.landmarks) {
      ctx.beginPath();
      ctx.arc(
        (engine.mirrored ? 1 - p.x : p.x) * 320,
        p.y * 240,
        2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
}
let cameraFrames = 0,
  lastCameraTime = -1,
  cameraFps = 0,
  cameraSampleTime = 0;
function frame(t: number) {
  const dt = (t - lastFrame) / 1000;
  lastFrame = t;
  perf.update(t);
  if (running) {
    void tracker.tick(video, t);
    if (t - lastResult > 110) {
      state = engine.update([], t, null);
      applyState(state, t);
    }
    if (video.currentTime !== lastCameraTime) {
      lastCameraTime = video.currentTime;
      cameraFrames++;
    }
  }
  if (t - cameraSampleTime > 1000) {
    cameraFps = (cameraFrames * 1000) / (t - cameraSampleTime);
    cameraFrames = 0;
    cameraSampleTime = t;
  }
  if (mode === "hand" && state) {
    const speed = edgeScroll.update(
      state.point.y,
      t,
      state.visible && t - lastResult < 150,
      !["IDLE", "HOVERING"].includes(state.state),
    );
    if (speed) window.scrollBy(0, speed * Math.min(dt, 0.05));
  }
  interaction.tick(dt);
  scene?.render(t, perf.quality, state?.point);
  if (t - lastDebug > 300) {
    lastDebug = t;
    $("fps").textContent = Math.round(perf.fps) + " FPS";
    $("render-label").textContent = Math.round(perf.fps) + " FPS";
    $("quality-label").textContent = perf.quality;
    $("render-meter").style.width = Math.min(100, (perf.fps / 60) * 100) + "%";
    $("clock").textContent = new Date().toLocaleTimeString("en-GB");
    $("inspection-scale").textContent = (scene?.scale ?? 1).toFixed(2) + "×";
    drawLandmarks();
    if (!$("debug").hidden) {
      const b = ai.budget;
      $("debug-data").textContent =
        `Camera FPS      ${cameraFps.toFixed(1)}\nRender FPS      ${perf.fps.toFixed(1)}\nTracking FPS    ${running ? tracker.trackingFps.toFixed(1) : "0"}\nInference       ${tracker.inferenceMs.toFixed(1)} ms\nHand confidence ${((state?.confidence ?? 0) * 100).toFixed(0)}%\nRaw pointer     ${state ? `${state.raw.x.toFixed(3)}, ${state.raw.y.toFixed(3)}` : "—"}\nFiltered        ${state ? `${state.point.x.toFixed(3)}, ${state.point.y.toFixed(3)}` : "—"}\nVelocity        ${state ? Math.hypot(state.velocity.x, state.velocity.y).toFixed(3) : "—"}\nPinch ratio     ${state?.pinch.toFixed(3) ?? "—"}\nGesture         ${state?.state ?? "IDLE"}\nTarget          ${interaction.selected}\nQuality         ${perf.quality}\nGemini attempts ${b.geminiCalls}\nInput tokens    ${b.inputTokens}\nOutput tokens   ${b.outputTokens}\nEst. saved      ${b.estimatedTokensSaved}`;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
