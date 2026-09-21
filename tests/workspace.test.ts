import { expect, it } from "vitest";
import { CarouselController } from "../src/interaction/CarouselController";
import { classifyCommand } from "../src/ai/LocalCommands";
import { TutorialController } from "../src/tracking/TutorialController";

it("carousel follows hand direction with bounded inertia and settles at edges", () => {
 const c=new CarouselController(7); c.select(3);
 const start=c.position; c.move(.4,0); c.move(.6,100);
 expect(c.position).toBeGreaterThan(start);
 c.release(); const released=c.position; c.tick(.016);
 expect(c.position).toBeGreaterThan(released);
 for(let i=0;i<1000;i++) c.tick(.016);
 expect(c.position).toBeGreaterThanOrEqual(-6.001);
 expect(c.position).toBeLessThanOrEqual(.001);
 expect(Math.abs(c.velocity)).toBeLessThan(.01);
});
it.each(["Jarvis, open diagnostics","close","go back","open earth","next card","previous card","zoom in","summarize this screen"])("classifies %s locally", text => expect(classifyCommand(text)).not.toBeNull());
it("routes knowledge questions to the model", () => expect(classifyCommand("Explain quantum computing simply")).toBeNull());
it("tutorial cannot advance from timeout or a mouse click", () => {
 const t=new TutorialController();
 for(let now=0;now<100000;now+=1000) t.update({visible:false,x:.5,y:.5,pinch:1,state:"OPEN",click:false,hold:false,zoom:1,hands:0},now);
 expect(t.stage).toBe(0);
});
it("tutorial requires left then right, a confirmed pinch, hold and actual drag", () => {
 const t=new TutorialController();
 const f={visible:true,x:.5,y:.5,pinch:.9,state:"OPEN",click:false,hold:false,zoom:1,hands:1};
 t.update(f,0);t.update(f,400);expect(t.stage).toBe(1);
 t.update({...f,onTarget:true},500);expect(t.stage).toBe(2);
 t.update({...f,x:.25},600);t.update({...f,x:.75},700);expect(t.stage).toBe(3);
 t.update({...f,onTarget:true,click:false},900);expect(t.stage).toBe(3);
 t.update({...f,onTarget:true,click:true},1000);expect(t.stage).toBe(4);
 t.update({...f,hold:true},1100);t.update({...f,hold:true},1800);expect(t.stage).toBe(5);
 t.update({...f,hold:true,x:.5},1900);t.update({...f,hold:true,x:.7},2000);expect(t.stage).toBe(6);
});
