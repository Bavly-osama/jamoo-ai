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
import { Workspace } from "./interaction/Workspace";
import { TutorialController, tutorialPrompts } from "./tracking/TutorialController";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
document.querySelector("#app")!.innerHTML = `
<main class="app-shell">
 <header class="topbar"><div class="brand"><div class="brand-symbol"></div><div><div class="brand-name">AETHER</div><small>SPATIAL INTELLIGENCE</small></div></div><div class="top-divider"></div><div class="system-label">NEURAL INTERFACE<br>PERSONAL WORKSPACE / 01</div><div class="top-right"><div class="status" id="connection"><i></i><span>STANDBY</span></div><button class="utility" id="camera-toggle">Enable camera</button><button class="utility" id="diagnostics" aria-label="Diagnostics" data-target="diagnostics">Diagnostics</button></div></header>
 <div class="workspace"><div class="workspace-heading"><div><div class="eyebrow">YOUR SPACE. YOUR CONTROL.</div><h1>Beyond the screen.</h1></div><div class="coordinates">SPATIAL ENVIRONMENT / ACTIVE<br><span id="clock">00:00:00</span> LOCAL TIME</div></div>
 <div class="workspace-grid">
  <aside class="side-stack"><section class="instrument"><div class="instrument-title"><span>REACTOR OUTPUT</span><span class="tiny">SIM</span></div><div class="big">4.82 <small>GW</small></div><svg class="energy-chart" viewBox="0 0 230 60" preserveAspectRatio="none" aria-label="Simulated reactor output"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#80e5ec" stop-opacity=".2"/><stop offset="1" stop-color="#80e5ec" stop-opacity="0"/></linearGradient></defs><path d="M0 45 15 45 22 34 36 38 42 18 51 34 66 31 77 35 85 15 94 29 111 26 123 30 135 17 142 25 156 21 165 28 177 12 187 23 205 18 217 22 230 10V60H0Z" fill="url(#fill)"/><path d="M0 45 15 45 22 34 36 38 42 18 51 34 66 31 77 35 85 15 94 29 111 26 123 30 135 17 142 25 156 21 165 28 177 12 187 23 205 18 217 22 230 10" fill="none" stroke="#80cbd6" stroke-width="1.2"/></svg><div class="metric"><span>Core stability</span><b>98.6%</b></div></section>
  <section class="instrument"><div class="instrument-title"><span>SYSTEM INTEGRITY</span><span class="tiny">LIVE</span></div><div class="metric"><span>Rendering</span><b id="render-label">Initializing</b></div><div class="meter"><span id="render-meter"></span></div><div class="metric"><span>Hand tracking</span><b id="tracking-label">Offline</b></div><div class="metric"><span>Processing</span><b>On device</b></div><div class="metric"><span>Quality</span><b id="quality-label">Adaptive</b></div></section></aside>
  <section class="core-stage" aria-label="Interactive hologram"><div class="scene" id="scene"></div><div class="core-top">HOLOGRAPHIC OBJECT / <span id="object-code">ARC–001</span></div><button class="reactor-control" id="core" data-target="core" aria-label="Inspect reactor"><span class="core-caption">NEURAL CORE</span><span class="core-word">AETHER</span><span class="core-id">SYNCHRONIZED · READY</span></button><nav class="orbit-menu" aria-label="Circular hologram menu">${[["core-module", "CORE", "-90deg"], ["globe", "ATLAS", "0deg"], ["scanner", "SCAN", "90deg"], ["systems", "SYS", "180deg"]].map(([id, label, a], i) => `<button class="orbit-node${i === 0 ? " active" : ""}" data-target="${id}" data-module-index="${i}" style="--a:${a}">${label}</button>`).join("")}</nav><div class="scale-indicator" id="scale" hidden><span>1.00×</span></div><div class="core-bottom"><p id="object-title">Arc reactor</p><div class="hologram-slider" id="hologram-slider" role="slider" aria-label="Hologram scale" aria-valuemin="50" aria-valuemax="170" aria-valuenow="100" data-target="hologram-scale"><span class="hologram-slider-fill" id="hologram-slider-fill"></span><span class="hologram-slider-thumb" id="hologram-slider-thumb" aria-hidden="true"></span><span class="hologram-slider-value" id="hologram-slider-value">1.00×</span></div><span class="tiny" id="object-hint">PINCH CORE TO INSPECT · SLIDE TO SCALE · TWO HANDS TO RESIZE</span></div></section>
  <aside class="side-stack"><section class="instrument"><div class="instrument-title"><span>PROXIMITY SCANNER</span><span class="tiny">SIM</span></div><div class="radar"><div class="radar-sweep"></div><i class="radar-dot" style="left:64%;top:32%"></i><i class="radar-dot" style="left:28%;top:62%"></i><i class="radar-dot" style="left:55%;top:73%"></i></div><div class="radar-label"><span>SECTOR 07</span><span>3 SIGNALS</span></div></section><section class="instrument"><div class="instrument-title"><span>NEURAL LINK</span><span class="tiny" id="link-mode">LOCAL</span></div><div class="signal-bars">${Array.from({ length: 34 }, (_, i) => `<i style="--h:${8 + Math.sin(i * 1.7) ** 2 * 25}px"></i>`).join("")}</div><div class="readout" style="margin-top:15px">Awaiting your next move.<br><em id="gesture-label">Mouse preview available</em></div></section></aside>
 </div>
 <section class="module-section" aria-label="Holographic modules"><div class="section-row"><div class="eyebrow">CONNECTED MODULES <span style="color:#4f7582">/ 04</span></div><div class="carousel-nav"><span>SWIPE CARDS</span><button class="arrow" id="previous" aria-label="Previous module" data-target="previous">←</button><span id="module-count">01 / 04</span><button class="arrow" id="next" aria-label="Next module" data-target="next">→</button></div></div><div class="card-slider" id="card-slider"><div class="card-slider-viewport" id="card-slider-viewport"><div class="card-slider-track modules" id="card-slider-track">
 ${[
   ["core-module", "◎", "Arc reactor", "ENERGY SYSTEM", "01"],
   ["globe", "◉", "Orbital atlas", "SPATIAL MAPPING", "02"],
   ["scanner", "⌖", "Target scanner", "PROXIMITY ANALYSIS", "03"],
   ["systems", "⌁", "System diagnostics", "INTERFACE TELEMETRY", "04"],
 ]
   .map(
     ([id, icon, title, label, n], i) =>
       `<button class="module card-slide ${i === 0 ? "active" : ""}" id="${id}" data-target="${id}" data-module-index="${i}" data-draggable="true"><span class="module-index">${n}</span><span class="module-icon">${icon}</span><div><h3>${title}</h3><p>${label}</p></div></button>`,
   )
   .join("")}
 </div></div><div class="card-slider-dots" id="card-slider-dots" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<button type="button" class="card-dot${i === 0 ? " active" : ""}" data-dot="${i}" aria-label="Go to card ${i + 1}"></button>`).join("")}</div><p class="card-slider-hint">Swipe left or right · pinch a card to select</p></div></section>
 <form class="command-bar" id="command"><div class="ai-orb">✦</div><label for="command-input">AETHER AI</label><input id="command-input" maxlength="240" autocomplete="off" placeholder="Try “open system diagnostics”" aria-label="AI command"><button type="submit" id="command-send">Send ↗</button></form>
 <footer class="footer"><div class="footer-left"><span>CONTROL <b id="control-mode">STANDBY</b></span><span>RENDER <b id="fps">—</b></span><span>BUILD <b>1.0.0</b></span></div><div class="privacy">Your camera stays on your device</div></footer></div>
</main>
<section class="welcome" id="welcome" aria-labelledby="welcome-title"><div class="welcome-panel"><div class="welcome-mark">⌁</div><div class="eyebrow">WELCOME TO AETHER</div><h2 id="welcome-title">A little less interface.<br>A lot more instinct.</h2><p id="setup-status" role="status">Move your hand to explore. Pinch to select.<br>Your workspace is a gesture away.</p><div class="setup-progress" id="setup-progress" hidden><span></span></div><button class="primary" id="enable">Enable camera</button><button class="secondary" id="preview">Explore with mouse</button><button class="secondary" id="cancel" hidden>Cancel setup</button><button class="tutorial-target" id="tutorial-target" data-target="tutorial" data-draggable="true" hidden><span class="tutorial-slider-label" id="tutorial-slider-label">Slide →</span><span class="tutorial-slider-thumb" id="tutorial-slider-thumb" aria-hidden="true"></span></button><div class="welcome-note">CAMERA PROCESSED LOCALLY · NO VIDEO UPLOADS<br>Good light. One hand. A little room to move.</div></div></section>
<div class="camera-preview" id="camera-preview" hidden><video id="video" muted playsinline></video><canvas id="landmarks"></canvas><span id="camera-caption">YOUR HAND</span></div><canvas id="hand-overlay" class="hand-overlay" aria-hidden="true"></canvas><div id="pointer" class="pointer" style="opacity:0"></div>
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
  ai = new GeminiCommandService();
const edgeScroll = new EdgeScrollController();
let scene: JarvisScene | undefined;
try {
  scene = new JarvisScene($("scene"));
} catch {
  $("scene").innerHTML = '<div class="scene-fallback"></div>';
  toast("WebGL is unavailable. Using a simple hologram.");
}
const workspace = new Workspace(scene, setHologramScale, toast);
let lesson = new TutorialController();
let setupGeneration = 0,
  running = false,
  starting = false,
  mode: "standby" | "mouse" | "hand" = "standby",
  state: TrackingState | undefined,
  lastHands: Hand[] = [],
  lastResult = -Infinity,
  lastHandSeen = -Infinity,
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
  openSince = 0,
  slideFill = 0,
  slideArmed = false;
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
  lastHandSeen = -Infinity;
  engine.update([], performance.now() + 1000, null);
  interaction.release();
  $("pointer").style.opacity = "0";
  $("camera-preview").hidden = true;
  $("camera-preview").classList.remove("prominent");
  $("camera-toggle").textContent = "Enable camera";
  $("tracking-label").textContent = "Offline";
  const overlay = $<HTMLCanvasElement>("hand-overlay");
  overlay.getContext("2d")?.clearRect(0, 0, overlay.width, overlay.height);
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
    $("camera-preview").classList.add("prominent");
    status("Camera connected. Loading local hand tracking…");
    await tracker.init();
    if (!starting || generation !== setupGeneration) return;
    running = true;
    starting = false;
    engine.mirrored = camera.facing === "user";
    engine.smoother.reset();
    const saved = CalibrationManager.load();
    engine.enter = saved?.facing === camera.facing ? saved.enter : .5;
    engine.exit = saved?.facing === camera.facing ? saved.exit : .7;
    engine.easyMode = false;
    engine.pinchDetector.reset();
    if(saved?.facing===camera.facing){workspace.sensitivity=saved.movementSensitivity;engine.smoother.deadZone=saved.deadZone;engine.primaryId=saved.dominantHand;}
    lesson = new TutorialController();
    calibration = new CalibrationManager();
    step = 0;
    stepSince = performance.now();
    openSince = 0;
    slideFill = 0;
    slideArmed = false;
    moveMin = 1;
    moveMax = 0;
    updateLessonUI();

    $("camera-toggle").textContent = "Disable camera";
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
function finishTutorial() {
  const c = calibration.finish(camera.facing);
  c.skipped = lesson.skipped;
  engine.enter = c.enter;
  engine.exit = c.exit;
  engine.averagePinchDuration = Math.max(80, Math.min(180,c.averagePinchDuration));
  workspace.sensitivity=c.movementSensitivity;
  engine.smoother.deadZone=c.deadZone;
  engine.easyMode = false;
  CalibrationManager.save(c);
  $("welcome").hidden = true;
  $("tutorial-target").hidden = true;
  $("tutorial-listen").hidden = true;
  $("tutorial-optional").hidden = true;
  $("camera-preview").classList.remove("prominent");
  step = -1;
  interaction.reset();
  setMode("hand");
  toast("You’re connected. Move, pinch, hold, release.");
}
function updateLessonUI() {
  step = lesson.stage;
  if(lesson.done){finishTutorial();return;}
  status(tutorialPrompts[step]);
  $("welcome-title").textContent = `JARVIS INITIALIZATION / ${step+1} OF 9`;
  $("setup-progress").querySelector<HTMLElement>("span")!.style.width = `${step/9*100}%`;
  $("tutorial-target").hidden = ![1,2,3,4,5,6].includes(step);
  $("tutorial-slider-label").textContent = ["","Target","← LEFT · RIGHT →","Pinch to select","Hold","Drag →","← CARDS →"][step] ?? "";
  $("tutorial-optional").hidden = step!==7 && step!==8;
  $("tutorial-optional").textContent = step===7 ? "Use single-hand controls (skip zoom)" : "Use text controls (skip microphone)";
  $("tutorial-listen").hidden = step!==8;
  $("tutorial-target").dataset.stage = String(step);
}
function nearTutorial(point: {x:number;y:number}) {
  const r=$("tutorial-target").getBoundingClientRect();
  return !$("tutorial-target").hidden && Math.hypot(point.x*innerWidth-r.left-r.width/2,point.y*innerHeight-r.top-r.height/2)<Math.max(45,r.width*.45);
}
function tutorialHit(point:{x:number;y:number}) {
  if(step>=0) return nearTutorial(point)?"tutorial":null;
  return interaction.hit(point.x*innerWidth,point.y*innerHeight);
}
let pinchStarted:number|null=null;
function tutorial(s:TrackingState,t:number) {
  if(step<0)return;
  const h=lastHands.find(h=>h.id===s.primaryId);
  if(!h||s.trackingLossMs>0)return;
  calibration.observe(s.raw.x,s.pinch,distance(h.landmarks[0],h.landmarks[9]),s.raw.y,Math.hypot(s.velocity.x,s.velocity.y),s.primaryId);
  if(s.pinchState==="POSSIBLE_PINCH")pinchStarted??=t;
  if(s.pinchState==="PINCH_CONFIRMED"&&pinchStarted!==null){calibration.recordPinch(t-pinchStarted);pinchStarted=null;}
  const previous=lesson.stage;
  lesson.update({visible:s.visible,x:s.point.x,y:s.point.y,pinch:s.pinch,state:s.pinchState,click:s.events.some(e=>e.type==="click"&&e.target==="tutorial"),hold:s.state==="DRAGGING"||s.state==="PINCHED",zoom:s.events.find(e=>e.type==="zoom")?.scale??1,hands:lastHands.length,onTarget:nearTutorial(s.point)},t);
  if(step===2||step===6)$("tutorial-target").style.setProperty("--pinch",String(s.point.x));
  if(lesson.stage!==previous)updateLessonUI();
}
tracker.onResult = (hands,time) => {
  lastResult=performance.now();
  if(hands.length){lastHands=hands;lastHandSeen=lastResult;}
  else if(lastResult-lastHandSeen>550)lastHands=[];
  // Never replay stale detections as new gesture observations.
  state=engine.update(hands,time,tutorialHit);
  applyState(state,time);
};
tracker.onError = (message) => {
  stopCamera();
  setMode("standby");
  toast(message);
};
function setHologramScale(scale: number) {
  if (!scene) return;
  scene.scale = Math.max(0.5, Math.min(1.7, scale));
  const pct = ((scene.scale - 0.5) / 1.2) * 100;
  $("hologram-slider-fill").style.width = `${pct}%`;
  $("hologram-slider-thumb").style.left = `${pct}%`;
  $("hologram-slider-value").textContent = `${scene.scale.toFixed(2)}×`;
  $("hologram-slider").setAttribute(
    "aria-valuenow",
    String(Math.round(scene.scale * 100)),
  );
  $("scale").hidden = false;
  $("scale").querySelector("span")!.textContent = `${scene.scale.toFixed(2)}×`;
  $("inspection-scale").textContent = `${scene.scale.toFixed(2)}×`;
}
function updateHologramSlider(s: TrackingState) {
  if (step >= 0 || !scene || !s.visible) return;
  if (s.state === "ZOOMING") {
    setHologramScale(scene.scale);
    return;
  }
  const track = $("hologram-slider");
  const r = track.getBoundingClientRect();
  if (!r.width) return;
  const px = s.point.x * innerWidth;
  const py = s.point.y * innerHeight;
  const over =
    px >= r.left - 36 &&
    px <= r.right + 36 &&
    py >= r.top - 48 &&
    py <= r.bottom + 48;
  if (!over) return;
  // Open hand or light pinch: slide like a physical slider under the reactor.
  if (s.pinch > 0.35 || s.state === "HOVERING" || s.state === "IDLE") {
    const local = clamp((px - r.left) / r.width, 0, 1);
    setHologramScale(0.5 + local * 1.2);
    track.classList.add("active");
  }
}
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
    if(step<0 && workspace.voice.state!=="IDLE" && !["drop","cancel"].includes(event.type) && !["listen","stop-voice","close-assistant","mute-voice"].includes(event.target??"")) continue;
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
    if(step<0)workspace.event(event);
    if (event.type === "zoom" && scene) {
      if (!wasZoom) zoomStartScale = scene.scale;
      setHologramScale(zoomStartScale * event.scale!);
    }
  }
  wasZoom = s.state === "ZOOMING";
  if (!wasZoom && step < 0 && !workspace.active && workspace.voice.state==="IDLE") updateHologramSlider(s);
  if (step < 0) workspace.update(s,time);
  if (!wasZoom && s.state !== "HOVERING" && s.hover !== "hologram-scale")
    $("hologram-slider").classList.remove("active");
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
function selectModule(index:number) {activeModule=Math.max(0,Math.min(9,index));workspace.select(activeModule);}
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
    setHologramScale(1);
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
$("tutorial-target").onclick = () => {};
$("tutorial-target").insertAdjacentHTML("afterend", '<button class="secondary" id="tutorial-listen" hidden>Listen: Jarvis, hello</button><button class="secondary" id="tutorial-optional" hidden></button>');
$("tutorial-listen").onclick=()=>workspace.voice.listen();
$("tutorial-optional").onclick=()=>{lesson.skipOptional();updateLessonUI();};
workspace.onSpeech=text=>{if(step===8){lesson.speech(text);updateLessonUI();}};
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
document.querySelectorAll<HTMLElement>(".orbit-node").forEach((el,i)=>el.onclick=()=>workspace.open(["energy","earth","mission","status"][i]));
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
$("ai-fallback").closest("label")?.remove();
$("debug").insertAdjacentHTML("beforeend", '<label>Pinch close<input id="pinch-close" type="range" min=".18" max=".7" step=".01" value=".5"></label><label>Pinch release<input id="pinch-release" type="range" min=".3" max="1" step=".01" value=".7"></label><button class="utility" id="save-thresholds">Save thresholds</button>');
$("pinch-close").oninput=e=>{engine.enter=Number((e.target as HTMLInputElement).value);engine.exit=Math.max(engine.exit,engine.enter+.1);($('pinch-release') as HTMLInputElement).value=String(engine.exit);};
$("pinch-release").oninput=e=>{engine.exit=Math.max(engine.enter+.1,Number((e.target as HTMLInputElement).value));};
$("save-thresholds").onclick=()=>{const c=CalibrationManager.load()??calibration.finish(camera.facing);c.enter=c.pinchCloseThreshold=engine.enter;c.exit=c.pinchReleaseThreshold=engine.exit;CalibrationManager.save(c);toast("Pinch thresholds saved.");};
document.addEventListener("keydown",e=>{if((e.target as HTMLElement).matches("input,textarea"))return;if(e.shiftKey&&e.key.toLowerCase()==="d")toggleDebug();if(e.key==="Escape"){$("inspection").hidden=true;$("debug").hidden=true;interaction.release();}});
// Pointer and keyboard fallback remain available independently of the camera.
let mouseGrab: string | null = null;
let slidingScale = false;
function scaleFromClientX(clientX: number) {
  const r = $("hologram-slider").getBoundingClientRect();
  if (!r.width) return;
  setHologramScale(0.5 + clamp((clientX - r.left) / r.width, 0, 1) * 1.2);
}
$("hologram-slider").addEventListener("pointerdown", (e) => {
  slidingScale = true;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  scaleFromClientX(e.clientX);
});
$("hologram-slider").addEventListener("pointermove", (e) => {
  if (slidingScale) scaleFromClientX(e.clientX);
});
$("hologram-slider").addEventListener("pointerup", () => {
  slidingScale = false;
});
$("hologram-slider").addEventListener("pointercancel", () => {
  slidingScale = false;
});
document.addEventListener("pointerdown", (e) => {
  if (!$("welcome").hidden) return;
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
    if (scene) setHologramScale(scene.scale - e.deltaY * 0.001);
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
  workspace.voice.dispose();
  workspace.assistant.cancel();
  scene?.dispose();
});
window.addEventListener("orientationchange", () => {
  interaction.reset();
  engine.smoother.reset();
});
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [5, 9],
  [9, 13],
  [13, 17],
];
const landmarkCanvas = $<HTMLCanvasElement>("landmarks"),
  landmarkCtx = landmarkCanvas.getContext("2d")!,
  handOverlay = $<HTMLCanvasElement>("hand-overlay"),
  overlayCtx = handOverlay.getContext("2d")!;
let displayHands: Hand[] = [];
function blendDisplayHands(hands: Hand[]) {
  if (!hands.length) {
    displayHands = [];
    return displayHands;
  }
  if (
    !displayHands.length ||
    displayHands.length !== hands.length ||
    displayHands[0]?.id !== hands[0]?.id
  ) {
    displayHands = hands.map((h) => ({
      ...h,
      landmarks: h.landmarks.map((p) => ({ ...p })),
    }));
    return displayHands;
  }
  for (let i = 0; i < hands.length; i++) {
    const src = hands[i];
    const dst = displayHands[i];
    dst.confidence = src.confidence;
    for (let j = 0; j < 21; j++) {
      dst.landmarks[j].x += 0.45 * (src.landmarks[j].x - dst.landmarks[j].x);
      dst.landmarks[j].y += 0.45 * (src.landmarks[j].y - dst.landmarks[j].y);
      dst.landmarks[j].z += 0.45 * (src.landmarks[j].z - dst.landmarks[j].z);
    }
  }
  return displayHands;
}
function paintHandSkeleton(
  target: CanvasRenderingContext2D,
  width: number,
  height: number,
  screenSpace: boolean,
) {
  target.clearRect(0, 0, width, height);
  const age = performance.now() - lastHandSeen;
  if (!lastHands.length || age > 500) return;
  const hands = blendDisplayHands(lastHands);
  const alpha = age > 320 ? clamp(1 - (age - 320) / 180) : 1;
  for (const h of hands) {
    const pts = h.landmarks.map((p) => {
      const x = engine.mirrored ? 1 - p.x : p.x;
      return { x: x * width, y: p.y * height };
    });
    target.globalAlpha = alpha;
    target.lineWidth = screenSpace ? Math.max(2, width * 0.0025) : 2.5;
    target.strokeStyle = "rgba(126, 240, 255, 0.9)";
    target.shadowColor = "#5ddfff";
    target.shadowBlur = screenSpace ? 6 : 3;
    for (const [a, b] of HAND_CONNECTIONS) {
      target.beginPath();
      target.moveTo(pts[a].x, pts[a].y);
      target.lineTo(pts[b].x, pts[b].y);
      target.stroke();
    }
    target.shadowBlur = 0;
    if(!$("debug").hidden){
      target.strokeStyle="#ffe6a2";target.lineWidth=2;
      target.beginPath();target.moveTo(pts[4].x,pts[4].y);target.lineTo(pts[8].x,pts[8].y);target.stroke();
      target.font=screenSpace?"13px monospace":"10px monospace";target.fillStyle="#fff6a8";
      target.fillText(`${state?.pinch.toFixed(2)??"—"} | ${((state?.pinchConfidence??0)*100).toFixed(0)}% | ${state?.pinchState??"OPEN"}`,Math.max(5,Math.min(width-250,pts[8].x)),Math.max(16,pts[8].y-18));
    }
    for (let i = 0; i < pts.length; i++) {
      const tip = i === 4 || i === 8;
      target.beginPath();
      target.fillStyle = tip ? "#fff6a8" : "#b0faff";
      target.arc(
        pts[i].x,
        pts[i].y,
        tip ? (screenSpace ? 6 : 5) : screenSpace ? 3.5 : 3.2,
        0,
        Math.PI * 2,
      );
      target.fill();
    }
  }
  target.globalAlpha = 1;
}
function drawLandmarks() {
  const preview = $("camera-preview");
  if (!preview.hidden) {
    const w = Math.max(160, Math.round(preview.clientWidth) || 320);
    const h = Math.max(120, Math.round(preview.clientHeight) || 240);
    if (
      Math.abs(landmarkCanvas.width - w) > 4 ||
      Math.abs(landmarkCanvas.height - h) > 4
    ) {
      landmarkCanvas.width = w;
      landmarkCanvas.height = h;
    }
    paintHandSkeleton(
      landmarkCtx,
      landmarkCanvas.width,
      landmarkCanvas.height,
      false,
    );
  } else {
    landmarkCtx.clearRect(0, 0, landmarkCanvas.width, landmarkCanvas.height);
  }
  const forceDebug =
    !$("debug").hidden && $<HTMLInputElement>("show-landmarks").checked;
  if (running || forceDebug) {
    const w = innerWidth;
    const h = innerHeight;
    if (
      Math.abs(handOverlay.width - w) > 4 ||
      Math.abs(handOverlay.height - h) > 4
    ) {
      handOverlay.width = w;
      handOverlay.height = h;
    }
    paintHandSkeleton(overlayCtx, handOverlay.width, handOverlay.height, true);
  } else {
    overlayCtx.clearRect(0, 0, handOverlay.width, handOverlay.height);
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
  if(running && tracker.inferenceMs>45)perf.quality="LOW";
  if (running) {
    void tracker.tick(video, t);
    if (t - lastResult > 180) {
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
  workspace.tick(dt,t);
  scene?.render(t, perf.quality, state?.point);
  if (running || !$("camera-preview").hidden) drawLandmarks();
  if (t - lastDebug > 300) {
    lastDebug = t;
    $("fps").textContent = Math.round(perf.fps) + " FPS";
    $("render-label").textContent = Math.round(perf.fps) + " FPS";
    $("quality-label").textContent = perf.quality;
    $("render-meter").style.width = Math.min(100, (perf.fps / 60) * 100) + "%";
    $("clock").textContent = new Date().toLocaleTimeString("en-GB");
    $("inspection-scale").textContent = (scene?.scale ?? 1).toFixed(2) + "×";
    if (!$("debug").hidden) {
      const b = ai.budget;
      $("debug-data").textContent = `Pinch confidence ${(100*(state?.pinchConfidence??0)).toFixed(0)}%\nPinch state      ${state?.pinchState??"OPEN"}\nThresholds       ${engine.enter.toFixed(2)} / ${engine.exit.toFixed(2)}\nInteraction mode ${workspace.mode}\nActive module    ${workspace.active??"carousel"}\nTracking loss    ${state?.trackingLossMs??0} ms\nVoice state      ${workspace.voice.state}\nAssistant calls  ${workspace.assistant.requests}\nAssistant tokens ${workspace.assistant.inputTokens} in / ${workspace.assistant.outputTokens} out\n` +
        `Camera FPS      ${cameraFps.toFixed(1)}\nRender FPS      ${perf.fps.toFixed(1)}\nTracking FPS    ${running ? tracker.trackingFps.toFixed(1) : "0"}\nInference       ${tracker.inferenceMs.toFixed(1)} ms\nHand confidence ${((state?.confidence ?? 0) * 100).toFixed(0)}%\nRaw pointer     ${state ? `${state.raw.x.toFixed(3)}, ${state.raw.y.toFixed(3)}` : "—"}\nFiltered        ${state ? `${state.point.x.toFixed(3)}, ${state.point.y.toFixed(3)}` : "—"}\nVelocity        ${state ? Math.hypot(state.velocity.x, state.velocity.y).toFixed(3) : "—"}\nPinch ratio     ${state?.pinch.toFixed(3) ?? "—"}\nGesture         ${state?.state ?? "IDLE"}\nTarget          ${interaction.selected}\nQuality         ${perf.quality}\nGemini attempts ${b.geminiCalls}\nInput tokens    ${b.inputTokens}\nOutput tokens   ${b.outputTokens}\nEst. saved      ${b.estimatedTokensSaved}`;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
