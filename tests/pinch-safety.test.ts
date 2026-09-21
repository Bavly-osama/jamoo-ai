import { expect, it } from "vitest";
import { GestureEngine } from "../src/tracking/GestureEngine";
import { hand } from "./scenarios";

it.each([0.25, 0.5, 1, 2])("open hands never click at scale %s", scale => {
  const engine = new GestureEngine();
  const events = Array.from({length: 30}, (_, i) => engine.update([hand(.5,.5,.9,scale)], i*33, "core").events).flat();
  expect(events.filter(e => e.type === "click")).toHaveLength(0);
});
it("a cancelled pinch cannot accumulate confirmation across missing frames", () => {
  const engine = new GestureEngine();
  engine.update([hand(.5,.5,.15)], 0, "core");
  engine.update([], 40, "core");
  expect(engine.update([hand(.5,.5,.15)], 80, "core").events.filter(e => e.type === "click")).toHaveLength(0);
});
it("a stationary open hand does not close a module", () => {
  const engine = new GestureEngine();
  const events = Array.from({length: 50}, (_, i) => engine.update([hand()], i*33, "core").events).flat();
  expect(events.filter(e => e.type === "cancel")).toHaveLength(0);
});
it("a replacement hand must open before acquiring the previous hand's hold", () => {
  const engine = new GestureEngine();
  for(let t=0;t<400;t+=40) engine.update([hand(.5,.5,.15)],t,"core");
  const events = Array.from({length: 10}, (_, i) => engine.update([{...hand(.5,.5,.15),id:"Right"}],400+i*40,"core").events).flat();
  expect(events.filter(e => e.type === "click")).toHaveLength(0);
});
