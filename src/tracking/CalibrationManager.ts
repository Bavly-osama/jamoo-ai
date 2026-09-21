export interface Calibration {
  enter: number;
  exit: number;
  handScale: number;
  range: { minX: number; maxX: number };
  facing: string;
  created: number;
  pinchCloseThreshold: number;
  pinchReleaseThreshold: number;
  averagePinchDuration: number;
  movementSensitivity: number;
  deadZone: number;
  averageVelocity: number;
  dominantHand: string;
  zone: {minX:number;maxX:number;minY:number;maxY:number};
  skipped: string[];
}
export class CalibrationManager {
  private minX = 1;
  private maxX = 0;
  private minPinch = 1;
  private scales: number[] = [];
  private minY=1;private maxY=0;
  private speeds:number[]=[];
  private durations:number[]=[];
  private hands=new Map<string,number>();
  observe(x: number, pinch: number, scale: number, y=.5, velocity=0, hand="Left") {
    this.minX = Math.min(this.minX, x);
    this.maxX = Math.max(this.maxX, x);
    this.minPinch = Math.min(this.minPinch, pinch);
    if (this.scales.length < 300) this.scales.push(scale);
    this.minY=Math.min(this.minY,y);this.maxY=Math.max(this.maxY,y);
    if(this.speeds.length<1000)this.speeds.push(Math.abs(velocity));
    this.hands.set(hand,(this.hands.get(hand)??0)+1);
  }
  recordPinch(duration:number){if(duration>=40&&duration<=1000)this.durations.push(duration);}
  finish(facing: string): Calibration {
    const enter = Math.min(0.6, Math.max(0.22, this.minPinch + 0.16));
    return {
      enter,
      exit: enter + 0.16,
      handScale:
        this.scales.reduce((a, b) => a + b, 0) /
        Math.max(1, this.scales.length),
      range: { minX: this.minX, maxX: this.maxX },
      facing,
      created: Date.now(),
      pinchCloseThreshold:enter,pinchReleaseThreshold:enter+.18,
      averagePinchDuration:this.durations.length?this.durations.reduce((a,b)=>a+b,0)/this.durations.length:100,
      movementSensitivity:Math.max(1.5,Math.min(5,1.5/Math.max(.3,this.maxX-this.minX))),
      deadZone:.004,
      averageVelocity:this.speeds.reduce((a,b)=>a+b,0)/Math.max(1,this.speeds.length),
      dominantHand:[...this.hands].sort((a,b)=>b[1]-a[1])[0]?.[0]??"Left",
      zone:{minX:this.minX,maxX:this.maxX,minY:this.minY,maxY:this.maxY},skipped:[],
    };
  }
  static load(): Calibration | null {
    try {
      const c = JSON.parse(
        localStorage.getItem("aether-calibration") ?? "null",
      );
      return c &&
        Number.isFinite(c.enter) &&
        c.enter >= 0.15 &&
        c.enter <= 0.6 &&
        c.exit > c.enter &&
        Number.isFinite(c.handScale) && c.handScale > 0 &&
        Number.isFinite(c.movementSensitivity) &&
        Number.isFinite(c.zone?.minY) &&
        Date.now() - c.created < 30 * 86400000
        ? c
        : null;
    } catch {
      return null;
    }
  }
  static save(c: Calibration) {
    try {
      localStorage.setItem("aether-calibration", JSON.stringify(c));
    } catch {
      /* Storage can be disabled in private browsing. */
    }
  }
}
