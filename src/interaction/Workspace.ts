import {CarouselController} from "./CarouselController";
import {AssistantService} from "../ai/AssistantService";
import {VoiceController} from "../ai/VoiceController";
import {classifyCommand,type LocalCommand} from "../ai/LocalCommands";
import type {TrackingState,GestureEvent} from "../tracking/GestureEngine";
import type {JarvisScene} from "../scene/JarvisScene";

export const modules=[
 {id:"energy",title:"Energy Core",icon:"◎",label:"REACTOR INSPECTION",scene:"core"},
 {id:"earth",title:"Earth Scan",icon:"◉",label:"ORBITAL SURVEY",scene:"globe"},
 {id:"mission",title:"Mission Control",icon:"⌖",label:"TACTICAL WORKSPACE",scene:"scanner"},
 {id:"diagnostics",title:"Diagnostics",icon:"⌁",label:"LIVE TRACKING",scene:"systems"},
 {id:"status",title:"System Status",icon:"◈",label:"SYSTEM TELEMETRY",scene:"systems"},
 {id:"assistant",title:"AI Assistant",icon:"✦",label:"JARVIS VOICE LINK",scene:"core"},
 {id:"files",title:"Files",icon:"▤",label:"HOLOGRAPHIC ARCHIVE",scene:"systems"},
 {id:"armor",title:"Armor System",icon:"⬡",label:"SUIT SIMULATION",scene:"core"},
 {id:"network",title:"Network",icon:"⌘",label:"CONNECTION MONITOR",scene:"scanner"},
 {id:"camera",title:"Camera",icon:"◉",label:"LOCAL VISION",scene:"scanner"},
] as const;
const $=(id:string)=>document.getElementById(id)!;
export class Workspace {
 carousel=new CarouselController(modules.length);
 active:string|null=null;
 mode:"NAVIGATION"|"POINTER"|"DRAG"|"ZOOM"|"VOICE"="POINTER";
 sensitivity=4;
 assistant:AssistantService;
 voice:VoiceController;
 onSpeech:(text:string)=>void=()=>{};
 private sample?:TrackingState;
 private drag?:{x:number;y:number};
 private touch?:{x:number;y:number;moved:boolean;id:number};
 private suppressClick=false;
 private rotation={x:0,y:0};
 private lastTelemetry=0;
 private openTime=0;
 private focusReturn?:HTMLElement;
 constructor(private scene:JarvisScene|undefined,private scale:(n:number)=>void,private notify:(text:string)=>void){
  $("card-slider-track").innerHTML=modules.map((m,i)=>`<button class="module card-slide" id="module-${m.id}" data-target="module-${m.id}" aria-label="Open ${m.title}"><span class="module-index">${String(i+1).padStart(2,"0")}</span><span class="module-icon">${m.icon}</span><div><h3>${m.title}</h3><p>${m.label}</p></div><span class="target-brackets" aria-hidden="true"></span></button>`).join("");
  $("card-slider-dots").innerHTML=modules.map((m,i)=>`<button class="card-dot" data-dot="${i}" aria-label="Focus ${m.title}"></button>`).join("");
  $("card-slider-dots").removeAttribute("aria-hidden");
  document.querySelector(".module-section .eyebrow")!.textContent="JARVIS WORKSPACE / 10";
  document.querySelector(".card-slider-hint")!.textContent="Open hand pushes cards · point and pinch to open · arrows / touch available";
  document.body.insertAdjacentHTML("beforeend",`<section id="activity" class="activity" hidden aria-label="Interactive module"><header><div><div class="eyebrow">HOLOGRAPHIC WORKSPACE</div><h2 id="activity-title"></h2></div><button class="utility" id="close-activity" data-target="close-activity">Back to workspace ×</button></header><div class="activity-rings" aria-hidden="true"></div><div id="activity-body"></div></section><section class="assistant-panel" id="assistant-panel" hidden aria-label="Jarvis assistant"><button class="close" id="close-assistant" data-target="close-assistant" aria-label="Close assistant">×</button><div class="assistant-core" id="assistant-core"><i></i><i></i><i></i></div><div class="eyebrow" id="voice-state">IDLE</div><div class="voice-wave" aria-hidden="true">${Array.from({length:20},(_,i)=>`<i style="--delay:${i*.07}s"></i>`).join("")}</div><p id="assistant-response" role="status">Jarvis online. Ask a question or open a module.</p><div class="assistant-controls"><button class="utility" id="listen" data-target="listen">Listen</button><button class="utility" id="stop-voice" data-target="stop-voice">Stop</button><button class="utility" id="mute-voice" data-target="mute-voice">Mute voice</button></div><p class="voice-note">Press Listen, then say “Jarvis…” · type in the command bar below. Speech recognition may use your browser’s speech service.</p></section>`);
  this.assistant=new AssistantService(c=>this.command(c));
  this.voice=new VoiceController(state=>{ $("voice-state").textContent=state;$("assistant-core").dataset.state=state;$("assistant-panel").dataset.state=state; },text=>{this.onSpeech(text);void this.ask(text);},text=>{ $("assistant-response").textContent=text;this.notify(text);});
  $("listen").onclick=()=>this.voice.listen();$("stop-voice").onclick=()=>{this.assistant.cancel();this.voice.stop();};
  $("mute-voice").onclick=()=>{this.voice.muted=!this.voice.muted;this.voice.stop();$("mute-voice").textContent=this.voice.muted?"Enable voice":"Mute voice";};
  $("close-assistant").onclick=()=>this.closeAssistant();$("close-activity").onclick=()=>this.close();
  $("previous").onclick=()=>this.select(this.carousel.index-1);$("next").onclick=()=>this.select(this.carousel.index+1);
  document.querySelectorAll<HTMLElement>("[data-dot]").forEach(el=>el.onclick=()=>this.select(Number(el.dataset.dot)));
  modules.forEach((m,i)=>$("module-"+m.id).onclick=()=>{if(!this.suppressClick){this.select(i);this.open(m.id);}});
  const viewport=$("card-slider-viewport");
  viewport.addEventListener("pointerdown",e=>{this.touch={x:e.clientX,y:e.clientY,moved:false,id:e.pointerId};this.carousel.move(e.clientX/innerWidth,performance.now());});
  viewport.addEventListener("pointermove",e=>{if(!this.touch)return;if(Math.abs(e.clientX-this.touch.x)>8){this.touch.moved=true;viewport.setPointerCapture(e.pointerId);}if(this.touch.moved)this.carousel.move(e.clientX/innerWidth,performance.now(),innerWidth/this.cardWidth());});
  const release=()=>{this.suppressClick=!!this.touch?.moved;this.touch=undefined;this.carousel.release();setTimeout(()=>this.suppressClick=false,0);};
  viewport.addEventListener("pointerup",release);viewport.addEventListener("pointercancel",release);
  viewport.addEventListener("click",e=>{if(this.suppressClick){e.preventDefault();e.stopImmediatePropagation();}},true);
  $("command").onsubmit=e=>{e.preventDefault();const input=$("command-input") as HTMLInputElement;const text=input.value.trim();if(text){input.value="";void this.ask(text);}};
  $("command-input").setAttribute("placeholder","Jarvis, open Earth · ask anything…");document.querySelector('label[for="command-input"]')!.textContent="JARVIS";
  document.addEventListener("keydown",e=>{if((e.target as HTMLElement).matches("input,textarea"))return;if(e.key==="Escape"){this.close();this.closeAssistant();}if(e.key==="ArrowRight"&&!this.active)this.select(this.carousel.index+1);if(e.key==="ArrowLeft"&&!this.active)this.select(this.carousel.index-1);});
  this.select(0);
 }
 private cardWidth(){return (document.querySelector<HTMLElement>(".card-slide")?.offsetWidth??280)+16;}
 select(index:number){this.carousel.select(index);this.paint();}
 private paint(){
  const viewport=$("card-slider-viewport"),w=this.cardWidth();
  $("card-slider-track").style.transform=`translateX(${Math.max(12,(viewport.clientWidth-w+16)/2)+this.carousel.position*w}px)`;
  document.querySelectorAll<HTMLElement>(".card-slide").forEach((el,i)=>{const delta=i+this.carousel.position;el.style.setProperty("--depth",String(Math.min(1,Math.abs(delta))));el.classList.toggle("active",i===this.carousel.index);});
  document.querySelectorAll(".card-dot").forEach((el,i)=>el.classList.toggle("active",i===this.carousel.index));
  $("module-count").textContent=`${String(this.carousel.index+1).padStart(2,"0")} / 10`;
 }
 open(id:string){
  const m=modules.find(m=>m.id===id);if(!m)return;
  if(id==="assistant"){this.showAssistant();return;}
  this.close();this.active=id;this.openTime=performance.now();this.carousel.stop();this.focusReturn=document.activeElement as HTMLElement;
  $("activity").hidden=false;$("activity-title").textContent=m.title;document.body.classList.add("module-open");
  $("activity").classList.remove("opening");void $("activity").offsetWidth;$("activity").classList.add("opening");
  if(this.scene)this.scene.focus=m.scene;
  const body=$("activity-body");
  if(id==="earth"||id==="energy"){
   body.innerHTML=`<div id="module-projection" class="module-projection"><div id="projection-input" class="projection-input" data-target="projection" tabindex="0" role="application" aria-label="Rotate ${m.title}; arrow keys rotate, plus and minus zoom"></div></div><div class="projection-controls"><p id="location-readout">${id==="earth"?"Drag to rotate. Pinch or tap to select a coordinate.":"Drag to inspect reactor rings. Output is simulated."}</p><button class="utility" id="zoom-in" data-target="zoom-in">Zoom +</button><button class="utility" id="zoom-out" data-target="zoom-out">Zoom −</button><button class="utility" id="projection-reset" data-target="projection-reset">Reset view</button></div>`;
   $("module-projection").prepend($("scene"));$("scene").classList.add("module-scene");
   const input=$("projection-input");let previous:{x:number;y:number}|undefined;let moved=false;
   input.onpointerdown=e=>{previous={x:e.clientX,y:e.clientY};moved=false;input.setPointerCapture(e.pointerId);};
   input.onpointermove=e=>{if(previous){const dx=e.clientX-previous.x,dy=e.clientY-previous.y;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;this.rotate(dx/300,dy/300);previous={x:e.clientX,y:e.clientY};}};
   input.onpointerup=e=>{if(!moved)this.pick(e.clientX/innerWidth,e.clientY/innerHeight);previous=undefined;};input.onpointercancel=()=>previous=undefined;
   input.onkeydown=e=>{if(e.key.startsWith("Arrow")){e.preventDefault();this.rotate(e.key==="ArrowLeft"?-.1:e.key==="ArrowRight"?.1:0,e.key==="ArrowUp"?-.1:e.key==="ArrowDown"?.1:0);}if(e.key==="+"||e.key==="=")this.scale((this.scene?.scale??1)*1.1);if(e.key==="-")this.scale((this.scene?.scale??1)/1.1);};
   $("zoom-in").onclick=()=>this.scale((this.scene?.scale??1)*1.15);$("zoom-out").onclick=()=>this.scale((this.scene?.scale??1)/1.15);$("projection-reset").onclick=()=>{this.rotation={x:0,y:0};this.scene?.setRotation(0,0);this.scale(1);};
  }else if(id==="files"||id==="mission"){
   const names=id==="files"?["Flight log","Reactor notes","Navigation chart","System manual"]:["Satellite relay","Survey drone","Landing zone","Mission briefing"];
   body.innerHTML=`<p>Pinch and hold, or drag a tile. Keyboard: focus a tile and use arrow keys. These are local simulation assets.</p><div class="object-board">${names.map((name,i)=>`<button class="holo-object" data-target="${id==="files"?"file":"mission"}-${i}" data-draggable="true" style="--slot:${i}"><span>${id==="files"?"▤":"⌖"}</span>${name}</button>`).join("")}</div><p id="object-detail" role="status">Select an object to inspect it.</p>`;
   body.querySelectorAll<HTMLElement>(".holo-object").forEach((el,i)=>{el.onclick=()=>$("object-detail").textContent=id==="files"?["Flight log: demo sortie completed. Duration 14 minutes.","Reactor notes: inspect containment rings before simulated ignition.","Navigation chart: survey waypoints 30°N, 31°E and 40°N, 74°W.","System manual: point to target, pinch once, hold to drag, release to place."][i]:`${names[i]} selected. Move this object to plan your simulated mission.`;el.onkeydown=e=>{if(!e.key.startsWith("Arrow"))return;e.preventDefault();const x=Number(el.dataset.x??0)+(e.key==="ArrowRight"?15:e.key==="ArrowLeft"?-15:0),y=Number(el.dataset.y??0)+(e.key==="ArrowDown"?15:e.key==="ArrowUp"?-15:0);el.dataset.x=String(Math.max(-100,Math.min(100,x)));el.dataset.y=String(Math.max(-80,Math.min(80,y)));el.style.translate=`${el.dataset.x}px ${el.dataset.y}px`;};});
  }else if(id==="armor"){
   body.innerHTML=`<p>Armor power distribution · simulation</p><div class="armor-grid">${["Shields","Propulsion","Sensors"].map((n,i)=>`<label>${n}<input type="range" min="0" max="100" value="${[45,35,20][i]}" data-target="armor-${i}"><output>${[45,35,20][i]}%</output></label>`).join("")}</div><p id="armor-total">Power allocation: 100%</p>`;
   body.querySelectorAll("input").forEach(input=>input.oninput=()=>{input.nextElementSibling!.textContent=input.value+"%";const total=[...body.querySelectorAll("input")].reduce((s,i)=>s+Number(i.value),0);$("armor-total").textContent=`Power allocation: ${total}%${total>100?" — overload; reduce a subsystem":""}`;});
  }else{
   body.innerHTML=`<pre id="activity-telemetry" class="telemetry"></pre>${id==="network"?'<button class="utility" id="network-check" data-target="network-check">Check server connection</button><p id="network-result"></p>':""}${id==="camera"?'<p>Camera preview stays on device. Use the controls to reconnect or change camera.</p><button class="utility" id="activity-restart" data-target="activity-restart">Restart camera</button><button class="utility" id="activity-switch" data-target="activity-switch">Switch camera</button>':""}`;
   if(id==="network")$("network-check").onclick=()=>{const start=performance.now();$("network-result").textContent="Checking…";void fetch("/api/health",{signal:AbortSignal.timeout(5000)}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>$("network-result").textContent=`Server reachable · ${Math.round(performance.now()-start)} ms · Gemini ${d.aiEnabled?"configured":"not configured"}`).catch(()=>$("network-result").textContent="Server unreachable. Retry when connected.");};
   if(id==="camera"){$("activity-restart").onclick=()=>{this.close();$("restart-camera").click();};$("activity-switch").onclick=()=>{this.close();$("switch-camera").click();};}
  }
  $("close-activity").focus();
 }
 close(){
  if($("scene").classList.contains("module-scene")){document.querySelector(".core-stage")!.prepend($("scene"));$("scene").classList.remove("module-scene");}
  $("activity").hidden=true;document.body.classList.remove("module-open");this.active=null;this.drag=undefined;this.focusReturn?.focus();
 }
 showAssistant(){ $("assistant-panel").hidden=false;}
 closeAssistant(){this.assistant.cancel();this.voice.stop();$("assistant-panel").hidden=true;}
 async ask(text:string){
  const local=classifyCommand(text);if(!local)this.showAssistant();this.voice.stop();this.voice.setState("PROCESSING");
  try{const answer=await this.assistant.ask(text,value=>$("assistant-response").textContent=value);if(local)this.notify(answer);this.voice.speak(answer);}catch(e){const text=(e as Error).name==="AbortError"?"Response stopped or timed out. You can retry.":(e as Error).message;$("assistant-response").textContent=text;this.notify(text);this.voice.setState("IDLE");}
 }
 private command(c:LocalCommand):string{
  switch(c.action){case"open":this.open(c.module);return `Opening ${modules.find(m=>m.id===c.module)?.title??c.module}.`;case"close":this.close();this.closeAssistant();return "Back to the workspace.";case"next":this.select(this.carousel.index+1);return "Next card.";case"previous":this.select(this.carousel.index-1);return "Previous card.";case"zoom":this.scale((this.scene?.scale??1)*c.factor);return "Projection resized.";case"reset":this.close();this.select(0);this.scale(1);this.scene?.setRotation(0,0);return "Workspace reset.";case"hello":return "Hello. Jarvis is ready. You can ask a question or say open Earth.";case"summary":return `You are in ${this.active??"the module carousel"}. Camera ${$("tracking-label").textContent}. ${$("fps").textContent}. Point and pinch to select, hold to drag, or use mouse, touch and keyboard.`;}
 }
 private rotate(x:number,y:number){this.rotation.x+=y;this.rotation.y+=x;this.scene?.setRotation(this.rotation.x,this.rotation.y);}
 private pick(x:number,y:number){if(this.active!=="earth")return;const result=this.scene?.pickGlobe(x,y);$("location-readout").textContent=result?`Selected coordinate: ${result.lat.toFixed(1)}° latitude, ${result.lon.toFixed(1)}° longitude · illustrative globe` : "Point inside the globe to select a coordinate.";}
 event(e:GestureEvent){
  if(e.target==="projection"){
   if(e.type==="click"&&e.point){this.drag={...e.point};this.pick(e.point.x,e.point.y);}
   if(e.type==="drag"&&e.point&&this.drag){this.rotate((e.point.x-this.drag.x)*6,(e.point.y-this.drag.y)*6);this.drag={...e.point};}
  }
  if(e.type==="drop")this.drag=undefined;
 }
 update(s:TrackingState,t:number){
  this.sample=s;
  const voice=this.voice.state!=="IDLE";
  this.mode=voice?"VOICE":s.state==="ZOOMING"?"ZOOM":s.state==="DRAGGING"?"DRAG":"POINTER";
  const r=$("card-slider").getBoundingClientRect();const y=s.point.y*innerHeight;
  const navigation=!this.active&&!voice&&s.trackingLossMs===0&&s.visible&&s.pinchState==="OPEN"&&y>=r.top-70&&y<=r.bottom+70;
  if(navigation){this.mode="NAVIGATION";this.carousel.move(s.point.x,t,this.sensitivity);}else{this.carousel.release();if(s.pinchState!=="OPEN"||this.active)this.carousel.stop();}
 }
 tick(dt:number,t:number){
  this.carousel.tick(dt);this.paint();
  if(t-this.lastTelemetry<250)return;this.lastTelemetry=t;
  const telemetry=document.getElementById("activity-telemetry");if(!telemetry)return;
  const memory=(performance as Performance&{memory?:{usedJSHeapSize:number}}).memory;
  telemetry.textContent=`${this.active?.toUpperCase()} / LIVE\n\nRender          ${$("fps").textContent}\nCamera          ${$("camera-toggle").textContent==="Disable camera"?"streaming":"offline"}\nTracking        ${$("tracking-label").textContent}\nGesture         ${this.sample?.pinchState??"OPEN"}\nConfidence      ${((this.sample?.pinchConfidence??0)*100).toFixed(0)}%\nMode            ${this.mode}\nNetwork         ${navigator.onLine?"browser online":"offline"}\nAI              ${this.assistant.busy?"processing":this.voice.state}\nMemory          ${memory?(memory.usedJSHeapSize/1048576).toFixed(1)+" MB":"not exposed by browser"}\nCPU simulation  ${(24+Math.sin(t/1600)*8).toFixed(0)}% (SIM)\nTracking loss   ${Number.isFinite(this.sample?.trackingLossMs)?this.sample!.trackingLossMs.toFixed(0)+" ms":"no hand"}`;
 }
}
