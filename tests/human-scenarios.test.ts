import {expect,it} from "vitest";
import {GestureEngine} from "../src/tracking/GestureEngine";
import {hand} from "./scenarios";
import {PinchDetector} from "../src/tracking/PinchDetector";

for(const person of [{name:"A slow",speed:.001,scale:1},{name:"B fast",speed:.025,scale:1},{name:"C close",speed:.006,scale:2},{name:"D far",speed:.006,scale:.25},{name:"E poor confidence",speed:.006,scale:1,confidence:.2},{name:"F occlusion",speed:.006,scale:1,loss:true},{name:"G rapid reversals",speed:.03,scale:1},{name:"H mobile geometry",speed:.01,scale:.6}]){
 it(`person ${person.name}: open / close / hold / reverse / release / reacquire`,()=>{
  const engine=new GestureEngine();const events=[];
  for(let i=0;i<100;i++){
   const x=.5+Math.sin(i/12)*Math.min(.25,person.speed*12);
   const h=hand(x,.5,i>=20&&i<70?.12:.9,person.scale);h.confidence=person.confidence??.95;
   const lost=person.loss&&i>=40&&i<44;
   const state=engine.update(lost?[]:[h],i*33,"file");events.push(...state.events);
   expect(state.point.x).toBeGreaterThanOrEqual(0);expect(state.point.x).toBeLessThanOrEqual(1);
   expect(Number.isFinite(state.point.x+state.point.y+state.opacity)).toBe(true);
   if(state.state==="DRAGGING")expect(state.events.some(e=>e.type==="swipe")).toBe(false);
  }
  const clicks=events.filter(e=>e.type==="click");expect(clicks).toHaveLength(person.confidence?0:1);
  expect(events.filter(e=>e.type==="drop")).toHaveLength(person.confidence?0:1);
 });
}
it.each([0,.4,.9,1.4])("pinch is stable under rotation %s radians", angle=>{
 const p=new PinchDetector();const h=hand(.5,.5,.15);
 // Nondegenerate IP/PIP segments model fingers approaching in opposite directions.
 h.landmarks[6]={x:.5,y:.56,z:0};h.landmarks[3]={x:.58,y:.5,z:0};
 for(const point of h.landmarks){const y=point.y-.5,z=point.z;point.y=.5+y*Math.cos(angle)-z*Math.sin(angle);point.z=y*Math.sin(angle)+z*Math.cos(angle);}
 let confirmed=0;for(let t=0;t<700;t+=33)confirmed+=Number(p.update(h,t,.5,.7).confirmed);
 expect(confirmed).toBe(1);
});
it("seeded imperfect gestures never produce duplicate clicks before a release",()=>{
 const e=new GestureEngine();let seed=37;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 let clicks=0;
 for(let i=0;i<600;i++){
  const h=hand(.3+random()*.4,.3+random()*.4,i<30?.9:.1+random()*.1,.4+random());
  const s=e.update(random()<.05?[]:[h],i*33,"core");clicks+=s.events.filter(e=>e.type==="click").length;
  expect(Number.isFinite(s.point.x+s.point.y)).toBe(true);
 }
 expect(clicks).toBe(1);
});
