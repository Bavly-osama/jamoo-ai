import type { Hand, Landmark } from "./GestureEngine";

export type PinchState = "OPEN" | "POSSIBLE_PINCH" | "PINCHING" | "PINCH_CONFIRMED" | "HOLDING" | "RELEASING";
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const vector = (a: Landmark, b: Landmark) => [a.x-b.x,a.y-b.y,a.z-b.z];
const length = (v: number[]) => Math.hypot(...v);
const dot = (a: number[], b: number[]) => a.reduce((n,x,i) => n+x*b[i],0) / Math.max(1e-6,length(a)*length(b));
export const palmSize = (h: Hand) => Math.max(.015, length(vector(h.landmarks[0], h.landmarks[9])), length(vector(h.landmarks[5],h.landmarks[17])));
export class PinchDetector {
  state: PinchState = "OPEN";
  confidence = 0;
  ratio = 1;
  closed = false;
  private since = 0;
  private frames = 0;
  private previous = 1;
  private time = 0;
  reset() { this.state="OPEN"; this.closed=false; this.frames=0; this.confidence=0; this.time=0; }
  update(h: Hand, t: number, close: number, release: number, duration = 100) {
    const p=h.landmarks, palm=palmSize(h);
    this.ratio=length(vector(p[4],p[8]))/palm;
    const speed=(this.ratio-this.previous)/Math.max(.016,(t-this.time)/1000);
    this.previous=this.ratio; this.time=t;
    const index=vector(p[8],p[6]), thumb=vector(p[4],p[3]);
    const direction=clamp((1-dot(index,thumb))/2);
    // All geometry is 3D and palm-relative, so camera distance and hand rotation
    // cannot independently turn an open hand into a pinch.
    const distanceScore=clamp(1-this.ratio/Math.max(.1,close*1.5));
    const pose=clamp((length(index)+length(thumb))/palm);
    const velocity=clamp(1-Math.abs(speed)/8);
    const candidate=this.ratio<close;
    if(candidate) this.frames++; else if(!this.closed) this.frames=0;
    const temporal=clamp(this.frames/4);
    this.confidence=.5*distanceScore+.15*direction+.1*velocity+.15*temporal+.1*pose;
    let confirmed=false;
    if(!this.closed) {
      if(!candidate) { this.state=speed<-.3?"POSSIBLE_PINCH":"OPEN"; this.since=t; }
      else {
        if(this.frames===1) this.since=t;
        this.state=this.frames<2?"POSSIBLE_PINCH":"PINCHING";
        if(this.frames>=3 && t-this.since>=duration && this.confidence>=.52) {
          this.closed=true; confirmed=true; this.state="PINCH_CONFIRMED";
        }
      }
    } else if(this.ratio>Math.max(close+.08,release)) {
      if(this.state!=="RELEASING") this.since=t;
      this.state="RELEASING";
      if(t-this.since>=70) { this.reset(); this.ratio=length(vector(p[4],p[8]))/palm; }
    } else this.state="HOLDING";
    return {confirmed, closed:this.closed, state:this.state, confidence:this.confidence};
  }
}
